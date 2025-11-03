import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Users,
  TrendingUp,
  Plus,
  ExternalLink,
  MoreVertical,
  Download,
  Edit,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { debugLog, debugWarn } from '@/utils/debugLogger';
import { DeleteEventDialog } from '@/components/admin/DeleteEventDialog';
import { logger } from '@/lib/logger';
import { dateUtils } from '@/lib/utils/dateUtils';

interface OrganizerLogo {
  name: string;
  url: string;
}

interface EventData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  start_date: string | null;
  end_date: string | null;
  custom_limit?: string | number;
  logo_url?: string;
  logo_size?: 'small' | 'medium' | 'large';
  duration_hours?: string | number;
  manual_start_enabled?: boolean;
  is_active?: boolean;
  participant_count?: number;
  prd_count?: number;
  event_participants?: unknown[];
  organizers_logos?: OrganizerLogo[];
}

export default function AdminEvents() {
  const { isAdmin, user } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [organizersLogos, setOrganizersLogos] = useState<Array<{ name: string; url: string }>>([]);
  const [newOrganizerName, setNewOrganizerName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    start_date: '',
    end_date: '',
    custom_limit: '-1',
    logo_url: '',
    duration_hours: '',
    logo_size: 'small',
    manual_start_enabled: false,
    is_permanent: false,
  });
  const [useDuration, setUseDuration] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endingEvent, setEndingEvent] = useState<EventData | null>(null);
  const [endVisibility, setEndVisibility] = useState('public_ended');
  const [unpublishDate, setUnpublishDate] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchEvents();
    }
  }, [isAdmin]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          event_participants(count)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar stats de PRDs para cada evento
      const eventsWithStats = await Promise.all(
        (data || []).map(async event => {
          const { count: prdCount } = await supabase
            .from('event_actions')
            .select('*', { count: 'exact', head: true })
            .eq('event_slug', event.slug)
            .eq('action_type', 'create_prd');

          return {
            ...event,
            prd_count: prdCount || 0,
            participant_count: event.event_participants?.[0]?.count || 0,
            logo_size: (event.logo_size || 'small') as 'small' | 'medium' | 'large',
          };
        })
      );

      setEvents(eventsWithStats as any);
    } catch (error) {
      logger.error('Erro ao buscar eventos:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (
    event: EventData
  ): {
    label: string;
    variant: 'success' | 'info' | 'warning' | 'secondary';
    icon: string;
    pulse?: boolean;
  } => {
    // Detectar evento permanente (datas NULL)
    if (event.start_date === null && event.end_date === null) {
      return {
        label: 'INSCRIÇÕES ABERTAS',
        variant: 'success' as const,
        icon: '∞',
        pulse: true,
      };
    }

    const now = new Date();
    const startDate = new Date(event.start_date!);
    const endDate = new Date(event.end_date!);

    // Se não está ativo, está encerrado manualmente
    if (!event.is_active) {
      return {
        label: 'ENCERRADO',
        variant: 'secondary',
        icon: '🔒',
      };
    }

    // Ainda não começou
    if (now < startDate) {
      return {
        label: 'NÃO INICIADO',
        variant: 'info',
        icon: '⏳',
      };
    }

    // Em andamento
    if (now >= startDate && now <= endDate) {
      return {
        label: 'EM ANDAMENTO',
        variant: 'success',
        icon: '🔴',
        pulse: true,
      };
    }

    // Já terminou
    return {
      label: 'FINALIZADO',
      variant: 'warning',
      icon: '✅',
    };
  };

  const hasSpecificTime = (dateString: string): boolean => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Se horário é 00:00:00, significa que foi criado apenas com data
    // Se tem qualquer outro valor, tem horário específico
    return hours !== 0 || minutes !== 0 || seconds !== 0;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB');
      return;
    }

    try {
      setUploading(true);

      // Gerar nome único
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para bucket
      const { error: uploadError } = await supabase.storage
        .from('event-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data } = supabase.storage.from('event-logos').getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: data.publicUrl });
      setLogoPreview(data.publicUrl);
      toast.success('Logo enviada com sucesso!');
    } catch (error: any) {
      logger.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo_url: '' });
    setLogoPreview(null);
  };

  const handleOrganizerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ VALIDAÇÃO: Nome deve ser preenchido primeiro
    if (!newOrganizerName.trim()) {
      toast.error('Digite o nome do realizador antes de selecionar o arquivo');
      e.target.value = ''; // Limpa o input
      return;
    }

    // ✅ VALIDAÇÃO: Máximo de 5 realizadores
    if (organizersLogos.length >= 5) {
      toast.error('Máximo de 5 realizadores atingido');
      e.target.value = '';
      return;
    }

    // ✅ VALIDAÇÃO: Tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      e.target.value = '';
      return;
    }

    // ✅ VALIDAÇÃO: Tamanho
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB');
      e.target.value = '';
      return;
    }

    debugLog('📁 Arquivo selecionado:', file.name, '- Adicionando automaticamente...');

    // ✅ ADICIONAR AUTOMATICAMENTE (sem botão +)
    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `organizer-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('event-logos').getPublicUrl(filePath);

      const newOrganizers = [
        ...organizersLogos,
        {
          name: newOrganizerName.trim(),
          url: data.publicUrl,
        },
      ];

      setOrganizersLogos(newOrganizers);

      debugLog('✅ Realizador adicionado automaticamente! Total:', newOrganizers.length);
      debugLog('📋 Lista completa:', newOrganizers);

      toast.success(`Realizador "${newOrganizerName}" adicionado!`);

      // Limpar campos
      setNewOrganizerName('');
      e.target.value = '';
    } catch (error: any) {
      logger.error('Erro ao adicionar realizador:', error);
      toast.error('Erro ao adicionar realizador: ' + (error?.message || ''));
      e.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  // ✅ FUNÇÃO REMOVIDA - Upload automático em handleOrganizerFileSelect

  const handleRemoveOrganizerLogo = (index: number) => {
    setOrganizersLogos(organizersLogos.filter((_, i) => i !== index));
  };

  const handleCreateEvent = async () => {
    try {
      debugLog('🔍 [CREATE] organizersLogos antes de salvar:', organizersLogos);
      if (organizersLogos.length === 0) {
        debugWarn('⚠️ Nenhum realizador adicionado. Continuando com array vazio.');
      }

      const eventData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        custom_limit: parseInt(formData.custom_limit),
        created_by: user?.id,
        organizers_logos: organizersLogos,
        logo_url: formData.logo_url,
        logo_size: formData.logo_size,
      };

      // Eventos permanentes: datas = NULL
      if (formData.is_permanent) {
        eventData.start_date = null;
        eventData.end_date = null;
        eventData.duration_hours = null;
      } else {
        // Validação: Data de início é obrigatória para eventos normais
        if (!formData.start_date || formData.start_date.trim() === '') {
          toast.error('Data de início é obrigatória!');
          return;
        }

        eventData.start_date = dateUtils.convertBRTtoUTC(formData.start_date);

        if (useDuration && formData.duration_hours) {
          // Validar que duration_hours tem valor
          if (!formData.duration_hours || formData.duration_hours.trim() === '') {
            toast.error('Duração em horas é obrigatória quando usar modo "Por Duração"!');
            return;
          }

          const durationHours = parseInt(formData.duration_hours);
          if (durationHours <= 0) {
            toast.error('Duração deve ser maior que 0 horas');
            return;
          }

          eventData.duration_hours = durationHours;
          // Calcular end_date baseado na duração (já em UTC)
          const startDateUTC = new Date(eventData.start_date);
          const endDateUTC = new Date(
            startDateUTC.getTime() + durationHours * 60 * 60 * 1000
          );
          eventData.end_date = endDateUTC.toISOString();
        } else {
          // Validar end_date quando usar modo "Por Data"
          if (!formData.end_date || formData.end_date.trim() === '') {
            toast.error('Data de término é obrigatória quando usar modo "Por Data"!');
            return;
          }

          // Validar que end_date > start_date
          const startDateUTC = new Date(eventData.start_date);
          const endDateUTC = new Date(dateUtils.convertBRTtoUTC(formData.end_date));
          
          if (endDateUTC <= startDateUTC) {
            toast.error('Data de término deve ser posterior à data de início!');
            return;
          }

          eventData.end_date = dateUtils.convertBRTtoUTC(formData.end_date);
          eventData.duration_hours = null;
        }
      }

      debugLog('📦 [CREATE] Dados completos a serem enviados:', eventData);

      const { error } = await supabase.from('events').insert([eventData]);

      if (error) throw error;

      toast.success('Evento criado com sucesso!');
      setShowCreateModal(false);
      setFormData({
        name: '',
        slug: '',
        description: '',
        start_date: '',
        end_date: '',
        custom_limit: '-1',
        logo_url: '',
        duration_hours: '',
        logo_size: 'small',
        manual_start_enabled: false,
        is_permanent: false,
      });
      setUseDuration(false);
      setLogoPreview(null);
      setOrganizersLogos([]);
      setNewOrganizerName('');
      fetchEvents();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar evento');
    }
  };

  const handleStartEventNow = async (
    slug: string,
    eventName: string,
    originalStartDate: string
  ) => {
    const originalDate = new Date(originalStartDate);
    const formattedDate = originalDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (
      !confirm(
        `🚀 INICIAR "${eventName}" AGORA?\n\n` +
          `Data original: ${formattedDate}\n` +
          `Nova data: ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n` +
          `⚠️ Esta ação não pode ser desfeita!`
      )
    ) {
      return;
    }

    try {
      await supabase.functions.invoke('bulk-event-actions', {
        body: { event_slug: slug, action: 'start_event_now' },
      });

      toast.success('🚀 Evento iniciado manualmente!');
      fetchEvents();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao iniciar evento');
    }
  };

  const handleOpenEndEventDialog = (event: EventData) => {
    setEndingEvent(event);
    setShowEndDialog(true);
  };

  const handleEndEventWithOptions = async () => {
    try {
      await supabase.functions.invoke('bulk-event-actions', {
        body: {
          event_slug: endingEvent.slug,
          action: 'end_event_with_options',
          data: {
            visibility: endVisibility,
            unpublish_date: endVisibility === 'scheduled_removal' ? unpublishDate : null,
          },
        },
      });

      toast.success('Evento encerrado!');
      setShowEndDialog(false);
      setEndingEvent(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao encerrar evento');
    }
  };

  const handleEndEvent = async (slug: string) => {
    try {
      await supabase.functions.invoke('bulk-event-actions', {
        body: { event_slug: slug, action: 'end_event' },
      });

      toast.success('Evento encerrado!');
      fetchEvents();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao encerrar evento');
    }
  };

  const handleExportData = async (slug: string, eventName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('bulk-event-actions', {
        body: { event_slug: slug, action: 'export_data' },
      });

      if (error) throw error;

      // Download CSV
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-participantes.csv`;
      a.click();

      toast.success('Dados exportados!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao exportar dados');
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventToDelete.id);

      if (error) throw error;

      toast.success('Evento deletado com sucesso!');
      fetchEvents();
      setEventToDelete(null);
    } catch (error: any) {
      logger.error('Erro ao deletar evento:', error);
      toast.error(error?.message || 'Erro ao deletar evento');
    }
  };

  const openDeleteDialog = (eventId: string, eventName: string) => {
    setEventToDelete({ id: eventId, name: eventName });
    setDeleteDialogOpen(true);
  };

  const handleOpenEditModal = (event: EventData) => {
    setEditingEvent(event);
    const hasDuration = event.duration_hours !== null && event.duration_hours !== undefined;
    setUseDuration(hasDuration);

    // Garantir que organizers_logos seja um array válido
    const currentOrganizers = Array.isArray(event.organizers_logos) ? event.organizers_logos : [];

    debugLog('📂 [EDIT MODAL] Organizadores carregados do banco:', currentOrganizers);

    // Detectar se é evento permanente
    const isPermanent = event.start_date === null && event.end_date === null;

    // Converter UTC → BRT ao carregar no formulário
    setFormData({
      name: event.name,
      slug: event.slug,
      description: event.description || '',
      start_date: event.start_date ? dateUtils.convertUTCtoBRT(event.start_date) : '',
      end_date: event.end_date ? dateUtils.convertUTCtoBRT(event.end_date) : '',
      custom_limit: String(event.custom_limit),
      logo_url: event.logo_url || '',
      duration_hours: hasDuration ? String(event.duration_hours) : '',
      logo_size: event.logo_size || 'small',
      manual_start_enabled: event.manual_start_enabled || false,
      is_permanent: isPermanent,
    });
    setLogoPreview(event.logo_url || null);

    // Garantir que setState seja executado depois do setFormData
    setOrganizersLogos(currentOrganizers);

    setShowEditModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      debugLog('🔍 [UPDATE] organizersLogos antes de salvar:', organizersLogos);
      if (organizersLogos.length === 0) {
        debugWarn('⚠️ Nenhum realizador encontrado para update. Verifique o estado.');
      }

      // Validações
      if (!formData.name.trim()) {
        toast.error('Nome do evento é obrigatório');
        return;
      }

      const limitValue = parseInt(formData.custom_limit);
      if (limitValue < -1) {
        toast.error('Limite deve ser -1 (ilimitado) ou maior que 0');
        return;
      }

      const updateData: any = {
        name: formData.name,
        description: formData.description,
        custom_limit: limitValue,
        logo_url: formData.logo_url,
        organizers_logos: organizersLogos,
        logo_size: formData.logo_size,
        updated_at: new Date().toISOString(),
      };

      // Eventos permanentes: datas = NULL
      if (formData.is_permanent) {
        updateData.start_date = null;
        updateData.end_date = null;
        updateData.duration_hours = null;
      } else {
        // Validação: Data de início é obrigatória para eventos normais
        if (!formData.start_date || formData.start_date.trim() === '') {
          toast.error('Data de início é obrigatória!');
          return;
        }

        updateData.start_date = dateUtils.convertBRTtoUTC(formData.start_date);

        if (useDuration && formData.duration_hours) {
          // Validar que duration_hours tem valor
          if (!formData.duration_hours || formData.duration_hours.trim() === '') {
            toast.error('Duração em horas é obrigatória quando usar modo "Por Duração"!');
            return;
          }

          if (parseInt(formData.duration_hours) <= 0) {
            toast.error('Duração deve ser maior que 0 horas');
            return;
          }

          updateData.duration_hours = parseInt(formData.duration_hours);
          const startDateUTC = new Date(updateData.start_date!);
          const endDateUTC = new Date(
            startDateUTC.getTime() + parseInt(formData.duration_hours) * 60 * 60 * 1000
          );
          updateData.end_date = endDateUTC.toISOString();
        } else {
          // Validar end_date quando usar modo "Por Data"
          if (!formData.end_date || formData.end_date.trim() === '') {
            toast.error('Data de término é obrigatória quando usar modo "Por Data"!');
            return;
          }

          // Validar que end_date > start_date
          const startDateUTC = new Date(updateData.start_date!);
          const endDateUTC = new Date(dateUtils.convertBRTtoUTC(formData.end_date));
          
          if (endDateUTC <= startDateUTC) {
            toast.error('Data de término deve ser posterior à data de início!');
            return;
          }

          updateData.end_date = dateUtils.convertBRTtoUTC(formData.end_date);
          updateData.duration_hours = null;
        }
      }

      debugLog('📦 [UPDATE] Dados completos a serem enviados:', updateData);

      const { error } = await supabase.from('events').update(updateData).eq('id', editingEvent.id);

      if (error) throw error;

      toast.success('Evento atualizado com sucesso!');
      setShowEditModal(false);
      setEditingEvent(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        start_date: '',
        end_date: '',
        custom_limit: '-1',
        logo_url: '',
        duration_hours: '',
        logo_size: 'small',
        manual_start_enabled: false,
        is_permanent: false,
      });
      setUseDuration(false);
      setLogoPreview(null);
      setOrganizersLogos([]);
      setNewOrganizerName('');
      fetchEvents();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar evento');
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Gestão de Eventos</h1>
        <p className="text-muted-foreground">Gerencie hackathons e palestras</p>
      </div>

      <div>
        <div className="space-y-6">
          {/* Header com botão de criar */}
          <div className="flex items-center justify-between">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Evento
            </Button>
          </div>

          {/* Lista de eventos */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded mb-4" />
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </Card>
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Nenhum evento criado</h3>
              <p className="text-muted-foreground mb-4">Crie seu primeiro evento para começar</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Evento
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map(event => (
                <Card key={event.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{event.name}</h3>
                      {(() => {
                        const status = getEventStatus(event);

                        const brutalistColors: Record<string, string> = {
                          'EM ANDAMENTO': 'bg-green-600',
                          'NÃO INICIADO': 'bg-blue-500',
                          FINALIZADO: 'bg-red-500',
                          ENCERRADO: 'bg-gray-400',
                        };

                        return (
                          <div
                            className={`
                            inline-flex items-center gap-2 px-4 py-2
                            border-4 border-black
                            ${brutalistColors[status.label] || 'bg-gray-200'}
                            shadow-[4px_4px_0_0_#000]
                            font-black text-sm uppercase tracking-tight
                            text-white
                            ${status.pulse ? 'animate-pulse' : ''}
                            transition-all hover:shadow-[6px_6px_0_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]
                          `}
                          >
                            <span className="text-base">{status.icon}</span>
                            <span>{status.label}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEditModal(event)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Evento
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/eventos/${event.slug}/dashboard`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Dashboard ao Vivo
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/eventos/${event.slug}/controle`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            🎮 Controle ao Vivo
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/eventos/${event.slug}/votacao-config`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            ⚖️ Configurar Votação
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportData(event.slug, event.name)}>
                          <Download className="w-4 h-4 mr-2" />
                          Exportar Dados
                        </DropdownMenuItem>
                        {(() => {
                          const status = getEventStatus(event);
                          return (
                            status.label === 'NÃO INICIADO' &&
                            hasSpecificTime(event.start_date) && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStartEventNow(event.slug, event.name, event.start_date)
                                }
                                className="text-green-600 font-semibold"
                              >
                                🚀 Iniciar Agora
                              </DropdownMenuItem>
                            )
                          );
                        })()}
                        {(() => {
                          const status = getEventStatus(event);
                          return (
                            status.label === 'EM ANDAMENTO' && (
                              <DropdownMenuItem
                                onClick={() => handleOpenEndEventDialog(event)}
                                className="text-orange-600 font-semibold"
                              >
                                🏁 Finalizar Evento
                              </DropdownMenuItem>
                            )
                          );
                        })()}
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(event.id, event.name)}
                          className="text-destructive font-semibold"
                        >
                          🗑️ Deletar Evento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mb-4 min-h-[48px]">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description || '\u00A0'}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{event.participant_count} participantes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span>{event.prd_count} PRDs criados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">
                        {new Date(event.start_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                        {' → '}
                        {new Date(event.end_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-2">
                    {/* Botões de ação contextual */}
                    {(() => {
                      const status = getEventStatus(event);

                      // Evento NÃO INICIADO (com horário definido) → Mostrar botão INICIAR
                      if (status.label === 'NÃO INICIADO' && hasSpecificTime(event.start_date)) {
                        return (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() =>
                                handleStartEventNow(event.slug, event.name, event.start_date)
                              }
                            >
                              🚀 Iniciar Agora
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/evento/${event.slug}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Página
                            </Button>
                          </div>
                        );
                      }

                      // Evento EM ANDAMENTO → Mostrar botão FINALIZAR
                      if (status.label === 'EM ANDAMENTO') {
                        return (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                              onClick={() => handleOpenEndEventDialog(event)}
                            >
                              🏁 Finalizar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/evento/${event.slug}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Página
                            </Button>
                          </div>
                        );
                      }

                      // Evento FINALIZADO ou ENCERRADO → Só mostrar "Ver Página"
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(`/evento/${event.slug}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver Página Pública
                        </Button>
                      );
                    })()}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criar Evento */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
            <DialogDescription>
              Preencha os dados do evento. Eventos podem ter limite de tempo ou PRDs gerados.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="logos">Logos</TabsTrigger>
            </TabsList>

            {/* ABA 1: INFORMAÇÕES BÁSICAS */}
            <TabsContent value="basic" className="flex-1 mt-4 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pb-4">
                  <div>
                    <Label htmlFor="name">Nome do Evento</Label>
                    <Input
                      id="name"
                      placeholder="Campus Party 2025"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <Input
                      id="slug"
                      placeholder="campus-party-2025"
                      value={formData.slug}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      URL: /evento/{formData.slug || 'seu-slug'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Hackathon ao vivo de criação de PRDs"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Switch Inscrições Permanentes */}
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="is-permanent" className="font-semibold text-base">
                          ∞ Inscrições Permanentes
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Evento ficará aberto para inscrições indefinidamente, sem countdown
                        </p>
                      </div>
                      <input
                        id="is-permanent"
                        type="checkbox"
                        checked={formData.is_permanent}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            is_permanent: checked,
                            start_date: checked ? '' : prev.start_date,
                            end_date: checked ? '' : prev.end_date,
                            duration_hours: checked ? '' : prev.duration_hours,
                          }));
                        }}
                        className="w-5 h-5"
                      />
                    </div>
                  </div>

                  {/* Configuração de Tempo - Apenas se não for permanente */}
                  {!formData.is_permanent && (
                    <div className="space-y-4">
                      <Label>Configuração de Tempo</Label>
                    <div className="flex items-center gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setUseDuration(false)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          !useDuration
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        📅 Por Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseDuration(true)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          useDuration
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        ⏱️ Por Duração
                      </button>
                    </div>

                    {useDuration ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="start_date">Data/Hora de Início</Label>
                          <Input
                            id="start_date"
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="duration_hours">Duração (em horas)</Label>
                          <Input
                            id="duration_hours"
                            type="number"
                            min="0.5"
                            step="0.5"
                            placeholder="Ex: 2 (para 2 horas)"
                            value={formData.duration_hours}
                            onChange={e =>
                              setFormData({ ...formData, duration_hours: e.target.value })
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            O evento terminará automaticamente após {formData.duration_hours || '0'}{' '}
                            horas
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_date">Data de Início</Label>
                          <Input
                            id="start_date"
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end_date">Data de Término</Label>
                          <Input
                            id="end_date"
                            type="datetime-local"
                            value={formData.end_date}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  <div>
                    <Label htmlFor="custom_limit">Limite de PRDs</Label>
                    <Input
                      id="custom_limit"
                      type="number"
                      placeholder="-1 para ilimitado"
                      value={formData.custom_limit}
                      onChange={e => setFormData({ ...formData, custom_limit: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      -1 = ilimitado, 0+ = limite específico
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ABA 2: LOGOS */}
            <TabsContent value="logos" className="flex-1 mt-4 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6 pb-4">
                  <div className="space-y-2">
                    <Label>Logo do Evento</Label>
                    <div className="flex items-center gap-2">
                      {logoPreview ? (
                        <>
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="h-10 w-10 object-cover rounded border"
                          />
                          <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                            Remover
                          </Button>
                        </>
                      ) : (
                        <>
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('logo')?.click()}
                            className="w-full"
                            disabled={uploading}
                          >
                            📁 Escolher Logo (PNG, JPG, WEBP - máx. 2MB)
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <Label>Logos dos Realizadores</Label>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="organizer-name">Nome do Realizador</Label>
                        <Input
                          id="organizer-name"
                          placeholder="Ex: ECOA, Universidade XYZ, Instituto ABC..."
                          value={newOrganizerName}
                          onChange={e => setNewOrganizerName(e.target.value)}
                          disabled={uploading || organizersLogos.length >= 5}
                        />
                        {newOrganizerName.trim() === '' && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Digite o nome antes de selecionar o arquivo
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="organizer-logo">Logo do Realizador</Label>
                        <Input
                          id="organizer-logo"
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleOrganizerFileSelect}
                          disabled={
                            uploading || !newOrganizerName.trim() || organizersLogos.length >= 5
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {organizersLogos.length} de 5 realizadores adicionados
                        </p>
                      </div>
                    </div>

                    {organizersLogos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {organizersLogos.map((org, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={org.url}
                              alt={org.name}
                              className="w-16 h-16 object-contain border rounded"
                              title={org.name}
                            />
                            <button
                              onClick={() => handleRemoveOrganizerLogo(idx)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Tamanho dos Logos no Evento</Label>
                    <Select
                      value={formData.logo_size}
                      onValueChange={value => setFormData({ ...formData, logo_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeno (Recomendado)</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define o tamanho dos logos na página do evento
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEvent}>Criar Evento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Encerramento com Opções */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar Evento: {endingEvent?.name}</DialogTitle>
            <DialogDescription>Escolha como deseja finalizar este evento</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Visibilidade após encerramento:</Label>

              <Select value={endVisibility} onValueChange={setEndVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public_ended">
                    🏆 Mostrar como Finalizado (com ranking)
                  </SelectItem>
                  <SelectItem value="hidden">🚫 Despublicar Imediatamente</SelectItem>
                  <SelectItem value="scheduled_removal">⏰ Despublicar em Data Futura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {endVisibility === 'scheduled_removal' && (
              <div className="space-y-2">
                <Label>Data para despublicar:</Label>
                <Input
                  type="datetime-local"
                  value={unpublishDate}
                  onChange={e => setUnpublishDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            <div className="bg-muted p-3 rounded text-sm">
              {endVisibility === 'public_ended' && (
                <>✅ O evento aparecerá como "ENCERRADO" com o ranking final visível</>
              )}
              {endVisibility === 'hidden' && (
                <>🚫 O evento será removido imediatamente da página pública</>
              )}
              {endVisibility === 'scheduled_removal' && (
                <>⏰ O evento ficará visível até a data escolhida, depois será removido</>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEndEventWithOptions}
              disabled={endVisibility === 'scheduled_removal' && !unpublishDate}
            >
              Finalizar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Evento */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>Atualize as configurações do evento</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="logos">Logos</TabsTrigger>
            </TabsList>

            {/* ABA 1: INFORMAÇÕES BÁSICAS */}
            <TabsContent value="basic" className="flex-1 mt-4 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pb-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome do Evento *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do evento"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-slug">Slug (URL) *</Label>
                    <Input
                      id="edit-slug"
                      value={formData.slug}
                      onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="url-amigavel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Descrição *</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição do evento"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="edit-start_date">Data/Hora Início *</Label>
                        <span className="text-xs text-muted-foreground">
                          🌎 Horário: Brasília (BRT {dateUtils.getBrazilTimezoneOffset()})
                        </span>
                      </div>
                      <Input
                        id="edit-start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="edit-end_date">Data/Hora Fim *</Label>
                        <span className="text-xs text-muted-foreground">
                          🌎 Horário: Brasília (BRT {dateUtils.getBrazilTimezoneOffset()})
                        </span>
                      </div>
                      <Input
                        id="edit-end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      />
                      {formData.end_date && (
                        <p className="text-xs text-green-600">
                          ✅ Será salvo como: {dateUtils.format(new Date(dateUtils.convertBRTtoUTC(formData.end_date)), 
                            "dd/MM/yyyy 'às' HH:mm 'UTC'")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-duration_hours">Duração em Horas (Opcional)</Label>
                    <Input
                      id="edit-duration_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.duration_hours}
                      onChange={e => setFormData({ ...formData, duration_hours: e.target.value })}
                      placeholder="Ex: 2.5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Configure o tempo total disponível para o evento. Se não definido, será
                      ilimitado.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-custom_limit">Limite de PRDs (Opcional)</Label>
                    <Input
                      id="edit-custom_limit"
                      type="number"
                      value={formData.custom_limit}
                      onChange={e => setFormData({ ...formData, custom_limit: e.target.value })}
                      placeholder="-1 para ilimitado"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use -1 para ilimitado. Deixe vazio para usar o limite padrão do usuário.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ABA 2: LOGOS */}
            <TabsContent value="logos" className="flex-1 mt-4 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6 pb-4">
                  <div className="space-y-2">
                    <Label>Logo do Evento</Label>
                    <div className="flex items-center gap-2">
                      {formData.logo_url ? (
                        <>
                          <img
                            src={formData.logo_url}
                            alt="Logo"
                            className="h-10 w-10 object-cover rounded border"
                          />
                          <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                            Remover
                          </Button>
                        </>
                      ) : (
                        <>
                          <Input
                            id="edit-logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('edit-logo')?.click()}
                            className="w-full"
                          >
                            📁 Escolher Logo (PNG, JPG, WEBP - máx. 2MB)
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <Label>Logos dos Realizadores</Label>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-organizer-name">Nome do Realizador</Label>
                        <Input
                          id="edit-organizer-name"
                          placeholder="Ex: ECOA, Universidade XYZ, Instituto ABC..."
                          value={newOrganizerName}
                          onChange={e => setNewOrganizerName(e.target.value)}
                          disabled={organizersLogos.length >= 5}
                        />
                        {newOrganizerName.trim() === '' && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Digite o nome antes de selecionar o arquivo
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="edit-organizer-logo">Logo do Realizador</Label>
                        <Input
                          id="edit-organizer-logo"
                          type="file"
                          accept="image/*"
                          onChange={handleOrganizerFileSelect}
                          disabled={!newOrganizerName.trim() || organizersLogos.length >= 5}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {organizersLogos.length} de 5 realizadores adicionados
                        </p>
                      </div>
                    </div>

                    {organizersLogos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Realizadores adicionados:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {organizersLogos.map((logo, index) => (
                            <div key={index} className="relative p-2 border rounded-lg">
                              <img
                                src={logo.url}
                                alt={logo.name}
                                className="h-12 object-contain mx-auto"
                              />
                              <p className="text-xs text-center mt-1 truncate">{logo.name}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={() => handleRemoveOrganizerLogo(index)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Tamanho dos Logos dos Realizadores</Label>
                    <Select
                      value={formData.logo_size}
                      onValueChange={value => setFormData({ ...formData, logo_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeno (Recomendado)</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define o tamanho dos logos na página do evento
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent}>Atualizar Evento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de deleção */}
      <DeleteEventDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        eventName={eventToDelete?.name || ''}
        onConfirm={handleDeleteEvent}
      />
    </div>
  );
}
