import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Loader2 } from 'lucide-react';
import { PRDPreviewModal } from '@/components/community/PRDPreviewModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/logger';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'docs-today' | 'active-users' | 'docs-recent' | 'new-users';
  title: string;
}

interface UserData {
  user_id: string;
  name?: string;
  phone?: string;
  role?: string;
  doc_count: number;
  last_doc_at?: string;
  updated_at?: string;
}

interface Document {
  id: string;
  idea_preview: string;
  full_document: string;
  created_at: string;
  category: string;
  user_name: string;
  user_id: string;
}

interface ActiveUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  docs_today: number;
  last_doc_at: string;
}

export function StatsModal({ isOpen, onClose, type, title }: StatsModalProps) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, type]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (type === 'docs-today' || type === 'docs-recent') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const query = supabase
          .from('document_history')
          .select(
            `
            id,
            idea_preview,
            full_document,
            created_at,
            category,
            user_id,
            profiles!inner(name)
          `
          )
          .order('created_at', { ascending: false });

        if (type === 'docs-today') {
          query.gte('created_at', today.toISOString());
        } else {
          query.limit(10);
        }

        const { data, error } = await query;

        if (error) throw error;

        interface DocData {
          id: string;
          idea_preview: string;
          full_document: string;
          created_at: string;
          category?: string;
          profiles?: { name?: string };
        }
        setDocuments(
          data.map((doc: DocData) => ({
            id: doc.id,
            idea_preview: doc.idea_preview,
            full_document: doc.full_document,
            created_at: doc.created_at,
            category: doc.category || 'Sem categoria',
            user_name: doc.profiles?.name || 'Usuário',
            user_id: '',
          }))
        );
      } else if (type === 'active-users' || type === 'new-users') {
        const { data, error } = await supabase.rpc('get_users_with_details', {
          search_term: '',
          limit_count: 1000,
          offset_count: 0,
        });

        if (error) throw error;

        if (type === 'active-users') {
          // Filtrar apenas usuários com docs nas últimas 24h
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const filtered =
            data
              ?.filter((user: UserData) => {
                const lastDocCreated = user.last_doc_at ? new Date(user.last_doc_at) : null;

                return lastDocCreated && lastDocCreated >= oneDayAgo && user.doc_count > 0;
              })
              .map((user: UserData) => ({
                id: user.user_id,
                name: user.name || 'Sem nome',
                phone: user.phone || 'N/A',
                role: user.role || 'free',
                docs_today: user.doc_count,
                last_doc_at: user.last_doc_at || user.updated_at,
              }))
              .sort((a, b) => {
                return new Date(b.last_doc_at).getTime() - new Date(a.last_doc_at).getTime();
              }) || [];

          setActiveUsers(filtered);
        } else if (type === 'new-users') {
          // Filtrar apenas usuários criados hoje
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: acquisitionData } = await supabase
            .from('user_acquisition')
            .select('user_id, created_at')
            .gte('created_at', today.toISOString());

          const todayUserIds = new Set(acquisitionData?.map(a => a.user_id) || []);

          interface UserData {
            user_id: string;
            name?: string;
            phone?: string;
            role?: string;
            doc_count: number;
            updated_at: string;
            last_doc_at?: string;
          }

          const filtered =
            data
              ?.filter((user: UserData) => todayUserIds.has(user.user_id))
              .map((user: UserData) => ({
                id: user.user_id,
                name: user.name || 'Sem nome',
                phone: user.phone || 'N/A',
                role: user.role || 'free',
                docs_today: user.doc_count,
                last_doc_at: user.updated_at,
              }))
              .sort((a, b) => {
                return new Date(b.last_doc_at).getTime() - new Date(a.last_doc_at).getTime();
              }) || [];

          setActiveUsers(filtered);
        }
      }
    } catch (error) {
      logger.error('Error loading modal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'lifetime':
        return 'default';
      case 'student':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {title}{' '}
              {type === 'active-users' && activeUsers.length > 0 && `(${activeUsers.length})`}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : type === 'active-users' ? (
              <div className="space-y-3">
                {activeUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum usuário ativo nas últimas 24h
                  </p>
                ) : (
                  activeUsers.map(user => (
                    <div
                      key={user.id}
                      className="border-4 border-black p-4 rounded-lg bg-white hover:shadow-brutal transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-lg">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.phone}</p>
                        </div>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          <strong>{user.docs_today}</strong> documentos criados
                        </span>
                        <span className="text-muted-foreground">
                          Último:{' '}
                          {formatDistanceToNow(new Date(user.last_doc_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum documento encontrado
                  </p>
                ) : (
                  documents.map(doc => (
                    <div
                      key={doc.id}
                      className="border-4 border-black p-4 rounded-lg bg-white hover:shadow-brutal transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-bold text-lg">{doc.user_name}</p>
                          <Badge variant="outline" className="mt-1">
                            {doc.category}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {doc.idea_preview}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDoc(doc)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver completo
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedDoc && (
        <PRDPreviewModal
          prd={selectedDoc}
          open={true}
          onClose={() => setSelectedDoc(null)}
          canViewPremium={true}
          isAdmin={true}
        />
      )}
    </>
  );
}
