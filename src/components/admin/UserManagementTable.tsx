import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowUp,
  ArrowDown,
  Search,
  RefreshCw,
  Download,
  MoreVertical,
  FileText,
  Mail,
  Phone,
  Trash2,
  Plus,
  Users,
  Info,
  Calendar,
  ShoppingBag,
} from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { toast } from 'sonner';
import { exportToCSV, generateFilename, formatDateBR } from '@/utils/csvExport';
import { clearRoleCache } from '@/lib/roleCache';
import { debugLog } from '@/utils/debugLogger';
import { logger } from '@/lib/logger';

interface User {
  id: string;
  phone: string;
  name: string;
  email: string;
  role: string;
  docCount: number;
  productName?: string | null;
  updated_at: string;
  utm_source?: string | null;
  ref_code?: string | null;
  created_at?: string;
  last_doc_at?: string | null;
}

interface UserManagementTableProps {
  initialRoleFilter?: string;
}

export const UserManagementTable = ({ initialRoleFilter = 'all' }: UserManagementTableProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isSearchResult, setIsSearchResult] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [events, setEvents] = useState<Array<{ slug: string; name: string }>>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [addToEventModal, setAddToEventModal] = useState(false);
  const [selectedEventForAdd, setSelectedEventForAdd] = useState<string>('');
  const [isAddingToEvent, setIsAddingToEvent] = useState(false);
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter);
  const PAGE_SIZE = 20;

  const translateSource = (source: string | null) => {
    if (!source) return null;
    if (source.toLowerCase() === 'direct') return 'direto';
    return source;
  };

  // OTIMIZAÇÃO: Carregar dados ao montar componente
  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('slug, name')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setEvents(data || []);
  };

  useEffect(() => {
    loadUsers();
    loadEvents();
  }, []);

  useEffect(() => {
    debugLog('🎯 Filtros mudaram:', { selectedEvent, originFilter, roleFilter });
    loadUsers(1, search);
  }, [selectedEvent, originFilter, roleFilter]);

  // OTIMIZAÇÃO: Debounce mais agressivo (800ms) + cancelar requisições anteriores
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (search.trim()) {
        loadUsers(1, search.trim());
      } else if (isSearchResult) {
        loadUsers(1);
      }
    }, 800); // 800ms para reduzir chamadas desnecessárias

    return () => {
      clearTimeout(timer);
      controller.abort(); // Cancelar requisição anterior
    };
  }, [search]);

  const loadUsers = async (page = 1, searchTerm = '') => {
    try {
      setLoading(true);
      if (searchTerm) {
        setSearching(true);
      }

      const finalEventFilter = selectedEvent === 'all' ? null : selectedEvent;
      const finalSourceFilter = originFilter === 'all' ? null : originFilter;
      const finalRoleFilter = roleFilter === 'all' ? null : roleFilter;

      debugLog('📡 Chamando API com:', {
        page,
        searchTerm,
        eventFilter: finalEventFilter,
        sourceFilter: finalSourceFilter,
        roleFilter: finalRoleFilter,
      });

      const { data, error } = await supabase.functions.invoke('get-admin-users', {
        body: {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          search: searchTerm,
          event_slug: finalEventFilter,
          source_filter: finalSourceFilter,
          role_filter: finalRoleFilter,
        },
      });

      debugLog('✅ Resposta da API:', {
        total: data?.users?.length || 0,
        totalPages: data?.totalPages,
        firstUser: data?.users?.[0]?.name,
      });

      if (error) throw error;

      setUsers(data.users || data);
      setFilteredUsers(data.users || data);
      setTotalPages(
        data.totalPages || Math.ceil((data.total || (data.users || data).length) / PAGE_SIZE)
      );
      setTotalUsers(data.total || (data.users || data).length);
      setCurrentPage(page);
      setIsSearchResult(data.isSearchResult || false);
    } catch (error) {
      logger.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const fetchAllUsersForExport = async (): Promise<User[]> => {
    try {
      toast.loading('Buscando todos os usuários...', { id: 'fetch-all' });

      const { data, error } = await supabase.functions.invoke('get-admin-users', {
        body: {
          search: search || null,
          limit: 999999,
          offset: 0,
          event_slug: selectedEvent === 'all' ? null : selectedEvent,
          source_filter: originFilter === 'all' ? null : originFilter,
          role_filter: roleFilter === 'all' ? null : roleFilter,
        },
      });

      if (error) throw error;

      toast.success(`✅ ${data?.users?.length || 0} usuários carregados`, { id: 'fetch-all' });
      return data?.users || [];
    } catch (error) {
      logger.error('Error fetching all users:', error);
      toast.error('Erro ao buscar usuários para exportar', { id: 'fetch-all' });
      return [];
    }
  };

  const handlePromote = async (userId: string, currentRole: string) => {
    let nextRole: string;

    if (currentRole === 'free') {
      nextRole = 'student';
    } else if (currentRole === 'student') {
      nextRole = 'lifetime';
    } else if (currentRole === 'lifetime') {
      nextRole = 'admin';
    } else {
      toast.info('Usuário já é admin');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('manage-user-role', {
        body: {
          target_user_id: userId,
          new_role: nextRole,
        },
      });

      if (error) throw error;

      toast.success(`Usuário promovido para ${nextRole}!`);
      clearRoleCache();
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao promover usuário');
    }
  };

  const handleDemote = async (userId: string, currentRole: string) => {
    let previousRole: string;

    if (currentRole === 'admin') {
      previousRole = 'lifetime';
    } else if (currentRole === 'lifetime') {
      previousRole = 'student';
    } else if (currentRole === 'student') {
      previousRole = 'free';
    } else {
      toast.info('Usuário já é free');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('manage-user-role', {
        body: {
          target_user_id: userId,
          new_role: previousRole,
        },
      });

      if (error) throw error;

      toast.success(`Usuário rebaixado para ${previousRole}!`);
      clearRoleCache();
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao rebaixar usuário');
    }
  };

  const handleRevalidate = async (userId: string, userEmail: string, userName: string) => {
    try {
      toast.loading('Revalidando acesso Hotmart...', { id: 'revalidate' });

      const { data, error } = await supabase.functions.invoke('validate-hotmart-access', {
        body: {
          user_id: userId,
          email: userEmail,
          force_revalidate: true,
        },
      });

      if (error) throw error;

      toast.success(`✅ ${userName} revalidado! Role: ${data.role}`, {
        id: 'revalidate',
      });

      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao revalidar acesso', { id: 'revalidate' });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      toast.loading('Deletando usuário...', { id: 'delete-user' });

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { target_user_id: userToDelete.id },
      });

      if (error) throw error;

      toast.success('Usuário deletado com sucesso!', { id: 'delete-user' });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao deletar usuário', { id: 'delete-user' });
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleAddToEvent = async (userId?: string) => {
    const userIds = userId ? [userId] : Array.from(selectedUsers);

    if (userIds.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    if (!selectedEventForAdd) {
      toast.error('Selecione um evento');
      return;
    }

    try {
      setIsAddingToEvent(true);
      toast.loading(`Adicionando ${userIds.length} usuário${userIds.length > 1 ? 's' : ''}...`, {
        id: 'add-event',
      });

      const { data, error } = await supabase.functions.invoke('add-user-to-event', {
        body: {
          user_ids: userIds,
          event_slug: selectedEventForAdd,
        },
      });

      if (error) throw error;

      const event = events.find(e => e.slug === selectedEventForAdd);
      toast.success(`${data.message} ao evento "${event?.name}"`, { id: 'add-event' });

      setAddToEventModal(false);
      setSelectedEventForAdd('');
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao adicionar usuários', { id: 'add-event' });
    } finally {
      setIsAddingToEvent(false);
    }
  };

  const openAddToEventModal = (userId?: string) => {
    if (userId) {
      setSelectedUsers(new Set([userId]));
    }
    setAddToEventModal(true);
  };

  const handleExportCSV = async (selectedOnly = false) => {
    let usersToExport: User[];

    if (selectedOnly) {
      usersToExport = filteredUsers.filter(u => selectedUsers.has(u.id));
    } else {
      usersToExport = await fetchAllUsersForExport();
    }

    if (usersToExport.length === 0) {
      toast.error('Nenhum contato para exportar');
      return;
    }

    // Format data for CSV
    const csvData = usersToExport.map(user => ({
      Nome: user.name || '—',
      Email: user.email || '—',
      Telefone: user.phone || '—',
      Role: user.role,
      Produto: user.productName || '—',
      Origem: translateSource(user.utm_source) || '—',
      'Código Referência': user.ref_code || '—',
      'Docs Gerados': user.docCount,
      'Data Cadastro': formatDateBR(user.created_at || user.updated_at),
      'Último PRD': user.last_doc_at ? formatDateBR(user.last_doc_at) : '—',
      'Última Atualização': formatDateBR(user.updated_at),
    }));

    // Generate filename
    const filename = generateFilename(selectedOnly ? 'contatos-selecionados' : 'contatos');

    // Export
    exportToCSV(csvData, filename);

    // Success message
    toast.success(`✅ CSV exportado! (${usersToExport.length} contatos)`);
  };

  const handleBatchPromote = async () => {
    if (selectedUsers.size === 0) return;

    toast.loading(`Promovendo ${selectedUsers.size} usuários...`, { id: 'batch-promote' });
    let successCount = 0;

    for (const userId of selectedUsers) {
      const user = filteredUsers.find(u => u.id === userId);
      if (!user) continue;

      const nextRole =
        user.role === 'free'
          ? 'student'
          : user.role === 'student'
            ? 'lifetime'
            : user.role === 'lifetime'
              ? 'admin'
              : null;
      if (!nextRole) continue;

      try {
        await supabase.functions.invoke('manage-user-role', {
          body: { target_user_id: userId, new_role: nextRole },
        });
        successCount++;
      } catch (error) {
        logger.error('Erro ao promover:', userId, error);
      }
    }

    toast.success(`✅ ${successCount} usuários promovidos!`, { id: 'batch-promote' });
    clearRoleCache();
    setSelectedUsers(new Set());
    loadUsers();
  };

  const handleBatchRevalidate = async () => {
    if (selectedUsers.size === 0) return;

    toast.loading(`Revalidando ${selectedUsers.size} usuários...`, { id: 'batch-revalidate' });
    let successCount = 0;

    for (const userId of selectedUsers) {
      const user = filteredUsers.find(u => u.id === userId);
      if (!user?.email) continue;

      try {
        await supabase.functions.invoke('validate-hotmart-access', {
          body: { user_id: userId, email: user.email, force_revalidate: true },
        });
        successCount++;
      } catch (error) {
        logger.error('Erro ao revalidar:', userId, error);
      }
    }

    toast.success(`✅ ${successCount} usuários revalidados!`, { id: 'batch-revalidate' });
    setSelectedUsers(new Set());
    loadUsers();
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      free: 'bg-muted text-muted-foreground border-brutal font-bold uppercase tracking-wide',
      student: 'bg-accent/20 text-accent border-brutal font-bold uppercase tracking-wide',
      lifetime: 'bg-purple-500/20 text-purple-700 border-brutal font-bold uppercase tracking-wide',
      admin: 'bg-blue-500/20 text-blue-700 border-brutal font-bold uppercase tracking-wide',
    };

    return <Badge className={colors[role as keyof typeof colors] || colors.free}>{role}</Badge>;
  };

  if (loading) {
    return (
      <Card className="bg-white border-4 border-black shadow-brutal">
        <CardHeader>
          <CardTitle className="text-[#0a0a0a] font-black uppercase">
            Gerenciamento de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Skeleton UI - Tabela desktop */}
          <div className="hidden md:block space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#e5e5e5] rounded animate-pulse" />
            ))}
          </div>
          {/* Skeleton UI - Cards mobile */}
          <div className="md:hidden space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-[#e5e5e5] rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#0a0a0a] font-black uppercase text-xl">
                Gerenciamento de Usuários
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Mostrando {filteredUsers.length} de {totalUsers} usuários
              </p>
            </div>
            {selectedUsers.size > 0 && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="bg-[#9b87f5] text-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal font-black uppercase tracking-wide"
                      size="sm"
                    >
                      Ações ({selectedUsers.size})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white border-4 border-black shadow-brutal">
                    <DropdownMenuItem onClick={handleBatchPromote}>
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Promover Selecionados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBatchRevalidate}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Revalidar Selecionados
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExportCSV(true)}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Emails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openAddToEventModal()}>
                      <Users className="w-4 h-4 mr-2" />
                      Adicionar ao Evento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-4 border-black shadow-brutal">
                <SelectValue placeholder="Filtrar por evento" />
              </SelectTrigger>
              <SelectContent className="bg-white border-4 border-black shadow-brutal">
                <SelectItem value="all">Todos os usuários</SelectItem>
                <SelectItem value="none">Sem evento</SelectItem>
                {events.length > 0 && <SelectSeparator />}
                {events.map(event => (
                  <SelectItem key={event.slug} value={event.slug}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-4 border-black shadow-brutal">
                <SelectValue placeholder="Filtrar por origem" />
              </SelectTrigger>
              <SelectContent className="bg-white border-4 border-black shadow-brutal">
                <SelectItem value="all">Todas as origens</SelectItem>
                <SelectItem value="Direto">Direto</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-4 border-black shadow-brutal">
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent className="bg-white border-4 border-black shadow-brutal">
                <SelectItem value="all">Todas as roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => handleExportCSV()}
              className="bg-[#FF6B35] text-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal font-black uppercase tracking-wide w-full sm:w-auto"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">CSV ({filteredUsers.length})</span>
              <span className="sm:hidden text-xs">CSV ({filteredUsers.length})</span>
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <Input
                placeholder="Buscar usuário..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-white border-4 border-black text-[#0a0a0a] font-bold placeholder:text-[#666666] placeholder:font-normal"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-[#FF6B35] border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Results Info */}
        {isSearchResult && (
          <div className="mb-4 p-3 bg-[#FF6B35]/20 border-4 border-black rounded-lg">
            <p className="text-sm text-[#FF6B35] font-bold">
              ✓ {filteredUsers.length} resultado{filteredUsers.length !== 1 ? 's' : ''} encontrado
              {filteredUsers.length !== 1 ? 's' : ''}
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="ml-2 underline hover:text-[#0a0a0a] transition-brutal"
                >
                  Limpar busca
                </button>
              )}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {!isSearchResult && (
          <div className="flex justify-between items-center mb-4 p-3 bg-muted rounded-lg border-brutal">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || loading}
              onClick={() => loadUsers(currentPage - 1)}
              className="bg-card hover:shadow-brutal-hover transition-brutal text-foreground border-brutal shadow-brutal font-bold uppercase tracking-wide"
            >
              Anterior
            </Button>

            <span className="text-foreground text-sm font-bold uppercase tracking-wide">
              Mostrando página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || loading}
              onClick={() => loadUsers(currentPage + 1)}
              className="bg-card hover:shadow-brutal-hover transition-brutal text-foreground border-brutal shadow-brutal font-bold uppercase tracking-wide"
            >
              Próxima
            </Button>
          </div>
        )}
        {/* Desktop: Tabela */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-brutal bg-muted hover:bg-muted">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedUsers.size === filteredUsers.length && filteredUsers.length > 0
                    }
                    onCheckedChange={toggleAllUsers}
                    className="border-2"
                  />
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide">
                  Nome
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide">
                  Email
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide">
                  Telefone
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide">
                  Role
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide">
                  Origem
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide">
                  Ref
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide">
                  Docs
                </TableHead>
                <TableHead className="text-foreground font-black uppercase tracking-wide text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow
                  key={user.id}
                  className="border-b border-border hover:bg-muted transition-brutal"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                      className="border-2"
                    />
                  </TableCell>
                  <TableCell className="text-foreground font-bold text-base">
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors">
                          <span>{user.name || 'Sem nome'}</span>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 border-brutal shadow-brutal">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-accent" />
                            <div>
                              <p className="text-xs text-muted-foreground">Data de Cadastro</p>
                              <p className="font-bold">
                                {formatDateBR(user.created_at || user.updated_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-accent" />
                            <div>
                              <p className="text-xs text-muted-foreground">Último PRD Gerado</p>
                              <p className="font-bold">
                                {user.last_doc_at ? formatDateBR(user.last_doc_at) : '—'}
                              </p>
                            </div>
                          </div>

                          {user.productName && (
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-purple-600" />
                              <div>
                                <p className="text-xs text-muted-foreground">Produto Hotmart</p>
                                <p className="font-bold text-purple-600">{user.productName}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-sm font-bold">
                        {user.email || 'Sem email'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatDateBR(user.created_at || user.updated_at).slice(0, 10)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-bold">
                    {user.phone}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.utm_source ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-700 border-blue-300 font-bold text-xs"
                      >
                        {translateSource(user.utm_source)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.ref_code ? (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-700 border-green-300 font-mono text-xs"
                      >
                        {user.ref_code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {user.docCount > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-accent hover:text-accent hover:bg-accent/10 font-bold transition-brutal p-0 h-auto justify-start"
                        >
                          <Link
                            to={`/admin/documents?user=${user.id}&name=${encodeURIComponent(user.name || user.phone)}`}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            {user.docCount}
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm font-bold">0</span>
                      )}
                      {user.last_doc_at && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDateBR(user.last_doc_at).slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted border-brutal shadow-brutal hover:shadow-brutal-hover transition-brutal"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 bg-card border-brutal shadow-brutal z-50"
                        >
                          {/* 0. Adicionar ao Evento */}
                          <DropdownMenuItem
                            onClick={() => openAddToEventModal(user.id)}
                            className="text-[#9b87f5] hover:text-[#9b87f5] hover:bg-[#9b87f5]/10 cursor-pointer font-bold"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar ao Evento
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* 1. Revalidar Hotmart - sempre ativo */}
                          <DropdownMenuItem
                            onClick={() =>
                              handleRevalidate(user.id, user.email, user.name || user.phone)
                            }
                            className="text-accent hover:text-accent hover:bg-accent/10 cursor-pointer font-bold"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Revalidar Hotmart
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* 2. Promover - desabilitado se já é admin */}
                          <DropdownMenuItem
                            onClick={() =>
                              user.role !== 'admin' && handlePromote(user.id, user.role)
                            }
                            disabled={user.role === 'admin'}
                            className={
                              user.role === 'admin'
                                ? 'text-muted-foreground cursor-not-allowed opacity-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                            }
                          >
                            <ArrowUp className="w-4 h-4 mr-2" />
                            {user.role === 'admin'
                              ? 'Já é Admin'
                              : `Promover para ${user.role === 'free' ? 'Student' : user.role === 'student' ? 'Vitalício' : 'Admin'}`}
                          </DropdownMenuItem>

                          {/* 3. Rebaixar - desabilitado se já é free */}
                          <DropdownMenuItem
                            onClick={() => user.role !== 'free' && handleDemote(user.id, user.role)}
                            disabled={user.role === 'free'}
                            className={
                              user.role === 'free'
                                ? 'text-muted-foreground cursor-not-allowed opacity-50'
                                : 'text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer'
                            }
                          >
                            <ArrowDown className="w-4 h-4 mr-2" />
                            {user.role === 'free'
                              ? 'Já é Free'
                              : `Rebaixar para ${user.role === 'admin' ? 'Vitalício' : user.role === 'lifetime' ? 'Student' : 'Free'}`}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* 4. Ver Documentos - desabilitado se não tem docs */}
                          <DropdownMenuItem
                            asChild={user.docCount > 0}
                            disabled={user.docCount === 0}
                            className={
                              user.docCount === 0
                                ? 'text-muted-foreground cursor-not-allowed opacity-50'
                                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer'
                            }
                          >
                            {user.docCount > 0 ? (
                              <Link
                                to={`/admin/documents?user=${user.id}&name=${encodeURIComponent(user.name || user.phone)}`}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Ver {user.docCount} Documento{user.docCount !== 1 ? 's' : ''}
                              </Link>
                            ) : (
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 mr-2" />
                                Sem Documentos
                              </div>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* 5. Deletar Usuário - sempre com confirmação */}
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(user)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer font-bold"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: Cards Melhorados */}
        <div className="md:hidden space-y-3">
          {filteredUsers.map(user => (
            <Card key={user.id} className="bg-white border-[#e5e5e5] shadow-sm">
              <CardContent className="p-4">
                {/* Linha 1: Nome + Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <h3 className="font-semibold text-[#1a1a1a] text-base leading-tight cursor-pointer hover:text-accent transition-colors flex items-center gap-2">
                        {user.name || 'Sem nome'}
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </h3>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 border-brutal shadow-brutal">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-accent" />
                          <div>
                            <p className="text-xs text-muted-foreground">Data de Cadastro</p>
                            <p className="font-bold">
                              {formatDateBR(user.created_at || user.updated_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent" />
                          <div>
                            <p className="text-xs text-muted-foreground">Último PRD Gerado</p>
                            <p className="font-bold">
                              {user.last_doc_at ? formatDateBR(user.last_doc_at) : '—'}
                            </p>
                          </div>
                        </div>

                        {user.productName && (
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-purple-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Produto Hotmart</p>
                              <p className="font-bold text-purple-600">{user.productName}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  {getRoleBadge(user.role)}
                </div>

                <div className="h-px bg-[#e5e5e5] mb-3" />

                {/* Linha 2: Email com ícone */}
                <div className="flex items-start gap-2 mb-2">
                  <Mail className="w-4 h-4 text-[#737373] flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm text-[#525252] truncate">
                      {user.email || 'Sem email'}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">
                      {formatDateBR(user.created_at || user.updated_at).slice(0, 10)}
                    </div>
                  </div>
                </div>

                {/* Linha 3: Telefone com ícone */}
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4 text-[#737373] flex-shrink-0" />
                  <div className="text-sm text-[#525252]">{user.phone}</div>
                </div>

                {/* Linha 4: Origem e Ref */}
                {(user.utm_source || user.ref_code) && (
                  <div className="flex flex-col gap-1.5 mb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Via:</span>
                      {user.utm_source && (
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-700 border-blue-300 font-bold text-xs"
                        >
                          {translateSource(user.utm_source)}
                        </Badge>
                      )}
                      {user.ref_code && (
                        <>
                          <span className="text-muted-foreground">|</span>
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-700 border-green-300 font-mono text-xs"
                          >
                            {user.ref_code}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="h-px bg-[#e5e5e5] mb-3" />

                {/* Linha 4: Documentos + Menu de Ações */}
                <div className="flex items-center justify-between gap-2">
                  {/* Docs à esquerda */}
                  <div className="flex flex-col gap-0.5">
                    {user.docCount > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-blue-600 hover:bg-blue-50 h-auto px-3 py-1 justify-start"
                      >
                        <Link
                          to={`/admin/documents?user=${user.id}&name=${encodeURIComponent(user.name || user.phone)}`}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {user.docCount} doc{user.docCount !== 1 ? 's' : ''}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-[#a3a3a3] text-sm px-3">0 docs</span>
                    )}
                    {user.last_doc_at && (
                      <span className="text-[10px] text-muted-foreground/60 px-3">
                        {formatDateBR(user.last_doc_at).slice(0, 10)}
                      </span>
                    )}
                  </div>

                  {/* Dropdown de Ações */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-[#f5f5f5]">
                        <MoreVertical className="h-5 w-5 text-[#737373]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-white border-[#e5e5e5] shadow-lg z-50"
                    >
                      {/* 0. Adicionar ao Evento */}
                      <DropdownMenuItem
                        onClick={() => openAddToEventModal(user.id)}
                        className="text-[#9b87f5] hover:text-[#9b87f5] hover:bg-[#9b87f5]/10 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar ao Evento
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* 1. Revalidar Hotmart - sempre ativo */}
                      <DropdownMenuItem
                        onClick={() =>
                          handleRevalidate(user.id, user.email, user.name || user.phone)
                        }
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Revalidar Hotmart
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* 2. Promover - desabilitado se já é admin */}
                      <DropdownMenuItem
                        onClick={() => user.role !== 'admin' && handlePromote(user.id, user.role)}
                        disabled={user.role === 'admin'}
                        className={
                          user.role === 'admin'
                            ? 'text-[#a3a3a3] cursor-not-allowed opacity-50'
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                        }
                      >
                        <ArrowUp className="w-4 h-4 mr-2" />
                        {user.role === 'admin'
                          ? 'Já é Admin'
                          : `Promover → ${user.role === 'free' ? 'Student' : user.role === 'student' ? 'Vitalício' : 'Admin'}`}
                      </DropdownMenuItem>

                      {/* 3. Rebaixar - desabilitado se já é free */}
                      <DropdownMenuItem
                        onClick={() => user.role !== 'free' && handleDemote(user.id, user.role)}
                        disabled={user.role === 'free'}
                        className={
                          user.role === 'free'
                            ? 'text-[#a3a3a3] cursor-not-allowed opacity-50'
                            : 'text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer'
                        }
                      >
                        <ArrowDown className="w-4 h-4 mr-2" />
                        {user.role === 'free'
                          ? 'Já é Free'
                          : `Rebaixar → ${user.role === 'admin' ? 'Vitalício' : user.role === 'lifetime' ? 'Student' : 'Free'}`}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* 4. Ver Documentos - desabilitado se não tem docs */}
                      <DropdownMenuItem
                        asChild={user.docCount > 0}
                        disabled={user.docCount === 0}
                        className={
                          user.docCount === 0
                            ? 'text-[#a3a3a3] cursor-not-allowed opacity-50'
                            : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer'
                        }
                      >
                        {user.docCount > 0 ? (
                          <Link
                            to={`/admin/documents?user=${user.id}&name=${encodeURIComponent(user.name || user.phone)}`}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Documentos ({user.docCount})
                          </Link>
                        ) : (
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Sem Documentos
                          </div>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* 5. Deletar Usuário - sempre com confirmação */}
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(user)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar Usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add to Event Modal */}
        <Dialog open={addToEventModal} onOpenChange={setAddToEventModal}>
          <DialogContent className="bg-white border-4 border-black shadow-brutal">
            <DialogHeader>
              <DialogTitle className="text-[#0a0a0a] font-black uppercase text-xl">
                Adicionar ao Evento
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Selecione o evento para adicionar {selectedUsers.size} usuário
                {selectedUsers.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Select value={selectedEventForAdd} onValueChange={setSelectedEventForAdd}>
                <SelectTrigger className="bg-white border-4 border-black shadow-brutal">
                  <SelectValue placeholder="Escolha um evento" />
                </SelectTrigger>
                <SelectContent className="bg-white border-4 border-black shadow-brutal">
                  {events.map(event => (
                    <SelectItem key={event.slug} value={event.slug}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddToEventModal(false);
                  setSelectedEventForAdd('');
                }}
                disabled={isAddingToEvent}
                className="border-brutal shadow-brutal hover:shadow-brutal-hover transition-brutal font-bold uppercase"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleAddToEvent()}
                disabled={!selectedEventForAdd || isAddingToEvent}
                className="bg-[#9b87f5] text-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal font-black uppercase"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-lg bg-card border-brutal shadow-brutal">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground font-black text-xl flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-destructive flex-shrink-0" />
                CONFIRMAR EXCLUSÃO
              </AlertDialogTitle>

              <AlertDialogDescription className="space-y-4 text-base">
                {/* Nome do usuário em destaque */}
                <p className="text-foreground font-bold text-lg break-words">
                  {userToDelete?.name || userToDelete?.phone}
                </p>

                {/* Aviso principal */}
                <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500 rounded-lg p-3 -mx-1">
                  <p className="text-red-700 dark:text-red-400 font-bold flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <span>Esta ação não pode ser desfeita.</span>
                  </p>
                </div>

                {/* Descrição dos dados */}
                <p className="text-sm sm:text-base text-muted-foreground">
                  Todos os dados do usuário serão permanentemente removidos:
                </p>

                {/* Lista compacta */}
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                    Perfil e informações pessoais
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                    Documentos e PRDs gerados ({userToDelete?.docCount || 0})
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                    Roles e permissões
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                    Histórico de atividades
                  </li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
              <AlertDialogCancel className="border-brutal shadow-brutal hover:shadow-brutal-hover transition-brutal font-bold uppercase sm:flex-1">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground border-brutal shadow-brutal hover:shadow-brutal-hover transition-brutal font-bold uppercase sm:flex-1 text-xs sm:text-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
