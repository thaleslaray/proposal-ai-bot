import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, ChevronDown, Copy, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Document {
  id: string;
  idea_preview: string;
  full_document: string;
  document_length: number;
  created_at: string;
  is_public: boolean;
}

export const MyDocuments = () => {
  const { user, permissions } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const fetchDocs = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('document_history')
      .select('id, idea_preview, full_document, document_length, created_at, is_public')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setDocuments(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, [user]);

  const toggleVisibility = async (docId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('document_history')
      .update({ is_public: !currentStatus })
      .eq('id', docId);

    if (error) {
      toast.error('Erro ao alterar visibilidade');
      return;
    }

    toast.success(
      !currentStatus ? '🌐 PRD agora está público na galeria!' : '🔒 PRD agora está privado'
    );

    fetchDocs();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('📋 Documento copiado!');
  };

  const openDeleteConfirmation = (docId: string, docTitle: string) => {
    setDeleteTarget({ id: docId, title: docTitle });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { error } = await supabase.from('document_history').delete().eq('id', deleteTarget.id);

    if (error) {
      logger.error('Erro ao deletar:', error);
      toast.error('❌ Erro ao deletar o documento');
    } else {
      toast.success('🗑️ Documento deletado com sucesso!');
      fetchDocs();
    }

    setDeleteTarget(null);
  };

  if (!user || documents.length === 0) return null;

  return (
    <>
      <Collapsible className="w-full max-w-5xl" open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full border-brutal shadow-brutal hover:shadow-brutal-hover h-12 sm:h-14 text-sm sm:text-base"
          >
            <FileText className="mr-2 h-5 w-5" />
            📚 Meus Documentos ({documents.length})
            <ChevronDown className="ml-auto h-5 w-5" />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Carregando...</div>
          ) : (
            documents.map(doc => (
              <Card
                key={doc.id}
                className="p-4 sm:p-5 cursor-pointer hover:shadow-brutal-hover transition-shadow border-brutal"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate mb-1">
                      {doc.idea_preview || 'Documento sem título'}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="truncate">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>{(doc.document_length / 1000).toFixed(1)}k chars</span>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDoc(doc)}
                      className="h-8 w-8 p-0"
                      title="Visualizar"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(doc.full_document)}
                      className="h-8 w-8 p-0"
                      title="Copiar"
                    >
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {permissions.canDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDeleteConfirmation(doc.id, doc.idea_preview)}
                        className="h-8 w-8 p-0"
                        title="Deletar"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {permissions.canToggleVisibility && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Switch
                      id={`public-${doc.id}`}
                      checked={doc.is_public}
                      onCheckedChange={() => toggleVisibility(doc.id, doc.is_public)}
                    />
                    <Label htmlFor={`public-${doc.id}`} className="text-xs cursor-pointer">
                      {doc.is_public ? '🌐 Público na Galeria' : '🔒 Privado'}
                    </Label>
                  </div>
                )}
              </Card>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] border-brutal shadow-brutal p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl font-bold">
              📄 Documento Gerado
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedDoc &&
                new Date(selectedDoc.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] sm:h-[50vh] pr-2 sm:pr-4">
            <div className="whitespace-pre-wrap text-xs sm:text-sm font-mono leading-relaxed">
              {selectedDoc?.full_document}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => selectedDoc && copyToClipboard(selectedDoc.full_document)}
              className="text-xs sm:text-sm"
            >
              <Copy className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Copiar
            </Button>
            <Button onClick={() => setSelectedDoc(null)} className="text-xs sm:text-sm">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="border-brutal shadow-brutal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2">
              🗑️ Deletar Documento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja deletar <strong>"{deleteTarget?.title}"</strong>?
              <br />
              <span className="text-destructive font-semibold">
                Esta ação não pode ser desfeita!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-brutal">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 border-brutal"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
