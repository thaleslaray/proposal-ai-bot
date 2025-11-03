import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Trash2, Shield, ArrowLeft, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
import { logger } from '@/lib/logger';

const PrivacySettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [consentVersion, setConsentVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Buscar dados de consentimento
    const fetchConsentData = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('lgpd_consent_date, lgpd_consent_version')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setConsentDate(data.lgpd_consent_date);
        setConsentVersion(data.lgpd_consent_version);
      }
    };

    fetchConsentData();
  }, [user, navigate]);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Buscar dados do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      // Buscar PRDs criados
      const { data: documents } = await supabase
        .from('document_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Buscar roles
      const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', user!.id);

      // Buscar uso de PRDs
      const { data: usage } = await supabase
        .from('prd_usage_tracking')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      // Montar objeto JSON com todos os dados
      const exportData = {
        export_date: new Date().toISOString(),
        user_id: user!.id,
        profile: profile || {},
        documents: documents || [],
        roles: roles || [],
        usage: usage || {},
        auth_metadata: {
          email: user!.email,
          phone: user!.phone,
          created_at: user!.created_at,
        },
      };

      // Criar blob e download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-funis-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('📦 Dados exportados com sucesso!');
    } catch (error) {
      logger.error('Error exporting data:', error);
      toast.error('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'excluir permanentemente') {
      toast.error('Digite "excluir permanentemente" para confirmar');
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-own-account', {
        body: { confirmation: deleteConfirm },
      });

      if (error) throw error;

      toast.success('✅ Conta excluída permanentemente com sucesso!');

      // Aguardar 1 segundo para o usuário ver a mensagem
      setTimeout(async () => {
        await signOut(); // Limpar sessão local
        navigate('/');
      }, 1000);
    } catch (error) {
      logger.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta. Entre em contato com o suporte.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-foreground bg-card py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Shield className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wide">
                Configurações de Privacidade
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie seus dados e preferências
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl space-y-6">
        {/* Consentimento LGPD */}
        <Card className="p-6 border-brutal shadow-brutal">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-wide">
              Histórico de Consentimento
            </h2>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Data de Aceite:</strong>{' '}
              {consentDate
                ? new Date(consentDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Não registrado'}
            </p>
            <p>
              <strong>Versão da Política:</strong> {consentVersion || 'N/A'}
            </p>
          </div>
          <div className="mt-4">
            <Link to="/privacidade">
              <Button variant="outline" size="sm">
                Ver Política de Privacidade
              </Button>
            </Link>
          </div>
        </Card>

        {/* Exportar Dados */}
        <Card className="p-6 border-brutal shadow-brutal">
          <div className="flex items-center gap-3 mb-4">
            <Download className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-black uppercase tracking-wide">Exportar Meus Dados</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Baixe uma cópia completa dos seus dados pessoais em formato JSON, incluindo perfil, PRDs
            criados, histórico de uso e configurações.
          </p>
          <Button onClick={handleExportData} disabled={isExporting} variant="default">
            {isExporting ? (
              'Exportando...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar Dados (JSON)
              </>
            )}
          </Button>
        </Card>

        {/* Excluir Conta */}
        <Card className="p-6 border-brutal shadow-brutal border-destructive">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="h-6 w-6 text-destructive" />
            <h2 className="text-xl font-black uppercase tracking-wide text-destructive">
              Zona de Perigo
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            <strong>Atenção:</strong> Esta ação é <strong>irreversível</strong>. Ao excluir sua
            conta, todos os seus dados serão permanentemente removidos, incluindo:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4 ml-4">
            <li>Perfil e informações pessoais</li>
            <li>Todos os PRDs criados</li>
            <li>Histórico de uso e estatísticas</li>
            <li>Likes, remixes e interações</li>
          </ul>
          <p className="text-sm text-muted-foreground mb-6">
            Recomendamos <strong>exportar seus dados</strong> antes de prosseguir.
          </p>
          <Button onClick={() => setShowDeleteDialog(true)} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Minha Conta
          </Button>
        </Card>

        {/* Dialog de Confirmação */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Confirmação de Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Esta ação é <strong>permanente e irreversível</strong>. Seus dados serão{' '}
                  <strong>deletados imediatamente</strong>.
                </p>
                <div className="bg-muted/30 p-3 rounded-lg text-xs">
                  <p className="mb-2">
                    <strong>O que será excluído:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Perfil e informações pessoais</li>
                    <li>Todos os documentos criados</li>
                    <li>Histórico de uso e estatísticas</li>
                    <li>Configurações e preferências</li>
                  </ul>
                  <p className="mt-3 text-muted-foreground">
                    ℹ️ Apenas registros mínimos de auditoria (ID e data) serão mantidos por 5 anos
                    para conformidade LGPD (Art. 37).
                  </p>
                </div>
                <p>
                  Para confirmar, digite <strong>"excluir permanentemente"</strong> no campo abaixo:
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="excluir permanentemente"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirm.toLowerCase() !== 'excluir permanentemente'}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default PrivacySettings;
