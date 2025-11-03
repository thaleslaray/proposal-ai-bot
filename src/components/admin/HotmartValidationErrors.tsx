import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, RefreshCw, Eye, Loader2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { debugLog } from '@/utils/debugLogger';
import { logger } from '@/lib/logger';

interface ValidationError {
  user_id: string;
  encrypted_email: string; // Criptografado - não exibir
  phone: string;
  validation_status: string;
  error_message: string;
  error_details: unknown;
  last_check: string;
  expires_at: string;
  product_name: string | null;
}

export const HotmartValidationErrors = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = async () => {
    try {
      // OTIMIZAÇÃO: LIMIT para não carregar centenas de erros de uma vez
      const { data, error } = await supabase
        .from('hotmart_validation_cache')
        .select('*')
        .neq('validation_status', 'success')
        .order('last_check', { ascending: false })
        .limit(50); // Limite de 50 erros mais recentes

      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      logger.error('Error loading validation errors:', error);
      toast.error('Erro ao carregar erros de validação');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (userId: string) => {
    setRetrying(userId);

    try {
      // Buscar email do perfil do usuário para revalidar
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (!profile?.email) {
        toast.error('Email não encontrado no perfil');
        return;
      }

      const { data, error } = await supabase.functions.invoke('validate-hotmart-access', {
        body: {
          user_id: userId,
          email: profile.email,
        },
      });

      if (error) throw error;

      toast.success(
        data?.validationStatus === 'success'
          ? '✅ Validação bem-sucedida!'
          : '⚠️ Ainda com erro, verifique detalhes'
      );

      await loadErrors();
    } catch (error) {
      toast.error('Erro ao revalidar');
    } finally {
      setRetrying(null);
    }
  };

  const handleTestHotmart = async () => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-hotmart-auth', {
        body: { email: testEmail },
      });

      if (error) throw error;

      if (data?.success) {
        const validTransactions = data.validTransactions || [];
        const hasAccess = validTransactions.length > 0;

        if (hasAccess) {
          // Extrair nomes dos produtos
          const productNames = validTransactions.map(
            (t: { productName: string; type: string }) =>
              `${t.productName} (${t.type === 'subscription' ? 'Assinatura' : 'Compra única'})`
          );

          toast.success(data.message || '✅ Acesso liberado!', {
            description: `Produtos encontrados:\n${productNames.join('\n')}`,
            duration: 5000,
          });
        } else {
          toast.info('Nenhuma assinatura ativa encontrada', {
            description: `Total verificado: ${data.summary?.totalSubscriptions || 0} assinaturas, ${data.summary?.totalPurchases || 0} compras`,
          });
        }
      } else {
        toast.error(data?.error || 'Erro desconhecido');
      }
    } catch (err) {
      toast.error('Erro ao testar Hotmart');
    } finally {
      setTestLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'timeout':
        return <Badge variant="destructive">Timeout</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-4 border-black">
        <CardContent className="p-6">
          <div className="h-40 animate-pulse bg-[#e5e5e5] rounded" />
        </CardContent>
      </Card>
    );
  }

  if (errors.length === 0) {
    return (
      <Card className="bg-white border-4 border-black shadow-brutal">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[#0a0a0a] font-black uppercase">
              <AlertCircle className="w-5 h-5 text-green-500" />
              Validações Hotmart
            </CardTitle>
            <Button
              onClick={() => setShowTestForm(!showTestForm)}
              variant="outline"
              size="sm"
              className="md:w-auto border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal bg-white text-[#0a0a0a] font-bold"
            >
              <FlaskConical className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Testar Hotmart</span>
            </Button>
          </div>
        </CardHeader>
        {showTestForm && (
          <div className="px-6 pb-4 space-y-3 border-b border-black">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              disabled={testLoading}
              className="bg-white border-4 border-black text-[#0a0a0a] font-bold placeholder:text-[#666666]"
            />
            <Button
              onClick={handleTestHotmart}
              disabled={testLoading || !testEmail.trim()}
              className="w-full bg-[#FF6B35] text-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal font-black"
            >
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                '🔍 Buscar Assinatura'
              )}
            </Button>
          </div>
        )}
        <CardContent>
          <p className="text-[#666666] font-bold">✅ Nenhum erro de validação no momento!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-brutal shadow-brutal">
      <CardHeader>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground flex-wrap font-black uppercase tracking-wide">
            <AlertCircle className="w-5 h-5 text-accent" />
            <span className="text-sm md:text-base">Erros Hotmart</span>
            <Badge variant="destructive" className="border-brutal font-bold">
              {errors.length}
            </Badge>
          </CardTitle>
          <Button
            onClick={() => setShowTestForm(!showTestForm)}
            className="w-auto h-8 bg-accent text-accent-foreground border-brutal shadow-brutal hover:shadow-brutal-hover transition-brutal font-bold uppercase tracking-wide"
            size="sm"
          >
            <FlaskConical className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{showTestForm ? 'Ocultar' : 'Testar'}</span>
          </Button>
        </div>
      </CardHeader>
      {showTestForm && (
        <div className="px-4 md:px-6 pb-4 space-y-3 border-b border-brutal">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              disabled={testLoading}
              className="flex-1 bg-card border-brutal text-foreground font-bold"
            />
            <Button
              onClick={handleTestHotmart}
              disabled={testLoading || !testEmail.trim()}
              className="w-full sm:w-auto bg-accent text-accent-foreground border-brutal shadow-brutal hover:shadow-brutal-hover transition-brutal font-bold uppercase"
            >
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                '🔍 Buscar'
              )}
            </Button>
          </div>
        </div>
      )}
      <CardContent>
        {/* Desktop: Tabela */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2a2a]">
                <TableHead className="text-[#a0a0a0]">Telefone</TableHead>
                <TableHead className="text-[#a0a0a0]">Status</TableHead>
                <TableHead className="text-[#a0a0a0]">Produto</TableHead>
                <TableHead className="text-[#a0a0a0]">Erro</TableHead>
                <TableHead className="text-[#a0a0a0]">Última Tentativa</TableHead>
                <TableHead className="text-[#a0a0a0]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map(error => (
                <TableRow key={error.user_id} className="border-[#2a2a2a]">
                  <TableCell className="text-white">{error.phone || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(error.validation_status)}</TableCell>
                  <TableCell className="text-[#a0a0a0]">{error.product_name || 'N/A'}</TableCell>
                  <TableCell className="text-white max-w-xs truncate">
                    {error.error_message || 'Sem mensagem'}
                  </TableCell>
                  <TableCell className="text-[#a0a0a0]">
                    {format(new Date(error.last_check), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(error.user_id)}
                        disabled={retrying === error.user_id}
                      >
                        {retrying === error.user_id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          debugLog('Error details:', error.error_details);
                          toast.info('Detalhes no console', {
                            description: 'Verifique o console do navegador',
                          });
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: Cards Ultra-Compactos */}
        <div className="md:hidden space-y-2">
          {errors.map(error => (
            <Card key={error.user_id} className="bg-[#0a0a0a] border-[#2a2a2a]">
              <CardContent className="p-3">
                {/* Linha 1: Telefone + Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-white text-sm">{error.phone}</span>
                  {getStatusBadge(error.validation_status)}
                </div>

                {/* Linha 2: Produto */}
                {error.product_name && (
                  <div className="mb-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {error.product_name}
                    </Badge>
                  </div>
                )}

                {/* Linha 3: Erro (se existir, compacto) */}
                {error.error_message && (
                  <div className="text-[10px] text-red-400 bg-[#1a1a1a] p-1.5 rounded mb-2 line-clamp-2">
                    {error.error_message}
                  </div>
                )}

                {/* Linha 4: Última tentativa + Ações */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2a2a2a]">
                  <span className="text-[10px] text-[#666]">
                    {format(new Date(error.last_check), 'dd/MM HH:mm')}
                  </span>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRetry(error.user_id)}
                      disabled={retrying === error.user_id}
                      className="text-[#f59e0b] hover:bg-[#f59e0b]/10 h-7 w-7 p-0"
                      title="Retentar validação"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${retrying === error.user_id ? 'animate-spin' : ''}`}
                      />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        debugLog('Error details:', error.error_details);
                        toast.info('Detalhes no console');
                      }}
                      className="text-[#667eea] hover:bg-[#667eea]/10 h-7 w-7 p-0"
                      title="Ver detalhes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
