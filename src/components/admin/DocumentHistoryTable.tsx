import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Search, Copy, Star } from 'lucide-react';
import { toast } from 'sonner';
import { PRDPreviewModal } from '@/components/community/PRDPreviewModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  user_id: string;
  idea_preview: string;
  full_document: string;
  document_length: number;
  created_at: string;
  user_name: string;
  is_featured?: boolean;
  featured_at?: string | null;
  likes_count?: number;
  remixes_count?: number;
}

interface DocumentHistoryTableProps {
  filterByUserId?: string | null;
  filterByUserName?: string;
  onClearFilter?: () => void;
}

export const DocumentHistoryTable = ({
  filterByUserId,
  filterByUserName,
  onClearFilter,
}: DocumentHistoryTableProps = {}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  // Carregar documentos ao montar ou mudar de página/filtro
  useEffect(() => {
    loadDocuments(currentPage);
  }, [currentPage, filterByUserId]);

  // Debounce na busca + reload
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadDocuments(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const loadDocuments = async (page = 1) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('get-document-history', {
        body: {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          user_id: filterByUserId || null,
          search_term: search.trim() || null,
        },
      });

      if (error) throw error;

      setDocuments(data?.documents || []);
      setTotalPages(data?.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      logger.error('Error loading documents:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Documento copiado!');
  };

  const formatLength = (length: number) => {
    if (length >= 1000) {
      return `${(length / 1000).toFixed(1)}k chars`;
    }
    return `${length} chars`;
  };

  const toggleFeatured = async (docId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('document_history')
        .update({
          is_featured: newStatus,
          featured_at: newStatus ? new Date().toISOString() : null,
        })
        .eq('id', docId);

      if (error) throw error;

      // Atualizar localmente
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === docId
            ? {
                ...doc,
                is_featured: newStatus,
                featured_at: newStatus ? new Date().toISOString() : null,
              }
            : doc
        )
      );

      toast.success(newStatus ? '✨ Marcado como Escolha do Editor!' : 'Desmarcado como Featured');
    } catch (error) {
      logger.error('Error toggling featured:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-4 border-black shadow-brutal">
        <CardHeader>
          <CardTitle className="text-[#0a0a0a] font-black uppercase">
            Histórico de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-[#666666] font-bold">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-[#0a0a0a] font-black uppercase tracking-wide">
                Histórico de Documentos
              </CardTitle>

              {filterByUserId && (
                <Badge
                  variant="outline"
                  className="bg-[#FF6B35]/20 text-[#FF6B35] border-4 border-black cursor-pointer hover:bg-[#FF6B35]/30 text-xs font-bold uppercase"
                  onClick={onClearFilter}
                >
                  {filterByUserName} ✕
                </Badge>
              )}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <Input
                placeholder="Buscar documento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-white border-4 border-black text-[#0a0a0a] font-bold placeholder:text-[#666666] placeholder:font-normal"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mb-3 px-3 py-2 bg-[#e5e5e5] rounded border-2 border-black">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || loading}
              onClick={() => loadDocuments(currentPage - 1)}
              className="h-8 bg-white border-2 border-black font-bold hover:bg-gray-50"
            >
              Anterior
            </Button>

            <span className="text-foreground text-xs font-bold uppercase">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || loading}
              onClick={() => loadDocuments(currentPage + 1)}
              className="h-8 bg-white border-2 border-black font-bold hover:bg-gray-50"
            >
              Próxima
            </Button>
          </div>

          {/* Desktop: Tabela */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-brutal hover:bg-muted bg-muted">
                  <TableHead className="text-foreground font-black uppercase tracking-wide">
                    Usuário
                  </TableHead>
                  <TableHead className="text-foreground font-black uppercase tracking-wide">
                    Preview da Ideia
                  </TableHead>
                  <TableHead className="text-foreground font-black uppercase tracking-wide">
                    Tamanho
                  </TableHead>
                  <TableHead className="text-foreground font-black uppercase tracking-wide">
                    Data
                  </TableHead>
                  <TableHead className="text-foreground font-black uppercase tracking-wide">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF6B35]" />
                        <span className="text-[#666]">Carregando documentos...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-[#a0a0a0]">
                        {filterByUserId
                          ? `Nenhum documento encontrado para ${filterByUserName}`
                          : search
                            ? 'Nenhum documento encontrado com esse filtro'
                            : 'Nenhum documento cadastrado'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map(doc => (
                    <TableRow
                      key={doc.id}
                      className="border-b border-border hover:bg-muted transition-brutal"
                    >
                      <TableCell className="text-foreground font-bold">{doc.user_name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate font-bold">
                        {doc.idea_preview.substring(0, 100)}...
                      </TableCell>
                      <TableCell className="text-muted-foreground font-bold">
                        {formatLength(doc.document_length)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-bold">
                        {format(new Date(doc.created_at), 'dd MMM yyyy, HH:mm', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedDoc(doc)}
                            className="h-8 w-8 p-0 hover:bg-accent/10 transition-colors"
                            title="Ver documento"
                          >
                            <Eye className="h-4 w-4 text-accent" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleFeatured(doc.id, doc.is_featured || false)}
                            className="h-8 w-8 p-0 hover:bg-purple-500/10 transition-colors"
                            title={doc.is_featured ? 'Remover destaque' : 'Marcar como Featured'}
                          >
                            <Star
                              className={`h-4 w-4 ${doc.is_featured ? 'fill-purple-500 text-purple-500' : 'text-muted-foreground'}`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(doc.full_document)}
                            className="h-8 w-8 p-0 hover:bg-green-500/10 transition-colors"
                            title="Copiar documento"
                          >
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B35]" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-center py-8 text-[#666]">
                {filterByUserId
                  ? `Nenhum documento encontrado para ${filterByUserName}`
                  : search
                    ? 'Nenhum documento encontrado'
                    : 'Nenhum documento cadastrado'}
              </p>
            ) : (
              documents.map(doc => (
                <Card key={doc.id} className="bg-white border-4 border-black shadow-brutal">
                  <CardContent className="p-3">
                    {/* Linha 1: ID + Data */}
                    <div className="flex items-center justify-between mb-2 text-[10px]">
                      <span className="font-mono text-[#666]">{doc.id.substring(0, 8)}...</span>
                      <span className="text-[#a0a0a0]">
                        {format(new Date(doc.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>

                    {/* Linha 2: Usuário */}
                    <h3 className="font-semibold text-[#0a0a0a] text-sm mb-2 truncate">
                      {doc.user_name}
                    </h3>

                    {/* Linha 3: Preview */}
                    <p className="text-xs text-[#666] line-clamp-2 mb-2">{doc.idea_preview}</p>

                    {/* Linha 4: Badge + Ações */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e5e5e5]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-[#FF6B35] text-[#FF6B35]"
                        >
                          {formatLength(doc.document_length)}
                        </Badge>
                        {doc.is_featured && (
                          <Badge
                            variant="default"
                            className="text-[10px] bg-yellow-500/20 text-yellow-500 border-yellow-500"
                          >
                            ⭐ Destaque
                          </Badge>
                        )}
                        {(doc.likes_count || 0) > 0 && (
                          <span className="text-[10px] text-[#666]">❤️ {doc.likes_count}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDoc(doc)}
                          className="h-7 w-7 p-0 hover:bg-[#FF6B35]/10"
                        >
                          <Eye className="h-3 w-3 text-[#FF6B35]" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFeatured(doc.id, doc.is_featured || false)}
                          className="h-7 w-7 p-0 hover:bg-yellow-500/10"
                        >
                          <Star
                            className={
                              doc.is_featured
                                ? 'h-3 w-3 fill-yellow-500 text-yellow-500'
                                : 'h-3 w-3 text-[#666]'
                            }
                          />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(doc.full_document)}
                          className="h-7 w-7 p-0 hover:bg-[#FF6B35]/10"
                        >
                          <Copy className="h-3 w-3 text-[#999]" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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
};
