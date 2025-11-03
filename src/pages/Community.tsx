import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PRDCard } from '@/components/community/PRDCard';
import { CategoryFilter } from '@/components/community/CategoryFilter';
import { PRDPreviewModal } from '@/components/community/PRDPreviewModal';
import { SearchBar } from '@/components/community/SearchBar';
import { HighlightsSection } from '@/components/community/HighlightsSection';
import { Leaderboard } from '@/components/community/Leaderboard';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { WhatsAppAuth } from '@/components/WhatsAppAuth';
import { LoadingState } from '@/components/states/LoadingState';
import { EmptyState } from '@/components/states/EmptyState';
import { PRDCardSkeleton } from '@/components/community/PRDCardSkeleton';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDisplayName, cn } from '@/lib/utils';
import { dateUtils } from '@/lib/utils/dateUtils';
import { Trophy, Sparkles, FileText, RefreshCw, Search, Plus } from 'lucide-react';
import { useToggleLike } from '@/hooks/useToggleLike';
import { useToggleRemix } from '@/hooks/useToggleRemix';
import { useInView } from 'react-intersection-observer';
import { debugLog } from '@/utils/debugLogger';
import { logger } from '@/lib/logger';
import { PRDDocument } from '@/types';

interface UserRole {
  user_id: string;
  role: string;
}

export default function Community() {
  const navigate = useNavigate();
  const { user, isStudent, isLifetime, isAdmin } = useAuth();
  const [prds, setPrds] = useState<PRDDocument[]>([]);
  const [filteredPrds, setFilteredPrds] = useState<PRDDocument[]>([]);
  const [category, setCategory] = useState('all');
  const [selectedPrd, setSelectedPrd] = useState<PRDDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingPrd, setPendingPrd] = useState<PRDDocument | null>(null);

  // Novos estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'remixes' | 'views'>('recent');

  // Estados para paginação e infinite scroll
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Estado para bottom navigation tabs (mobile)
  const [activeTab, setActiveTab] = useState<'prds' | 'creators' | 'highlights'>('prds');

  // Estados para highlights
  const [highlights, setHighlights] = useState({
    mostLiked: null,
    mostRemixed: null,
    featured: null,
  });
  const canViewPremium = isStudent || isLifetime || isAdmin;

  // Hook para infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Reset e fetch inicial quando categoria ou ordenação mudam
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPublicPRDs(1, false);
    fetchHighlights();
  }, [category, sortBy]);
  // Trigger de carregamento quando inView se torna true
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPublicPRDs(nextPage, true);
    }
  }, [inView, hasMore, isLoading, isLoadingMore, page]);

  useEffect(() => {
    applyFilters();
  }, [prds, searchTerm]);

  // Abrir modal automaticamente se URL tem ?prd=id
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prdId = params.get('prd');
    if (prdId && prds.length > 0) {
      const prd = prds.find(p => p.id === prdId);
      if (prd) {
        handleView(prd);
      }
    }
  }, [prds]);
  useEffect(() => {
    if (!user) return;
    const fetchUserLikes = async () => {
      const { data } = await supabase
        .from('prd_likes')
        .select('document_id')
        .eq('user_id', user.id);
      if (data) {
        setUserLikes(new Set(data.map(like => like.document_id)));
      }
    };
    fetchUserLikes();
  }, [user]);
  const fetchPublicPRDs = async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const startTime = performance.now();
    const PRDS_PER_PAGE = 20;
    const from = (pageNum - 1) * PRDS_PER_PAGE;
    const to = from + PRDS_PER_PAGE - 1;

    try {
      // Construir query com ordenação dinâmica
      let query = supabase
        .from('document_history')
        .select(
          `
          id,
          idea_preview,
          description,
          full_document,
          category,
          likes_count,
          remixes_count,
          view_count,
          tags,
          created_at,
          user_id,
          public_profiles!inner(
            name,
            username,
            avatar_url
          )
        `
        )
        .eq('is_public', true);

      // Filtro de categoria
      if (category !== 'all') {
        query = query.eq('category', category);
      }

      // Ordenação dinâmica baseada em sortBy
      switch (sortBy) {
        case 'likes':
          query = query.order('likes_count', { ascending: false });
          break;
        case 'remixes':
          query = query.order('remixes_count', { ascending: false });
          break;
        case 'views':
          query = query.order('view_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Paginação com range
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching PRDs:', error);
        toast.error('Erro ao carregar PRDs');
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (data) {
        // Se retornou menos que PRDS_PER_PAGE, não há mais dados
        setHasMore(data.length === PRDS_PER_PAGE);

        // Buscar roles em batch
        const uniqueUserIds = [...new Set(data.map((prd: PRDDocument) => prd.user_id))];
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', uniqueUserIds)
          .in('role', ['student', 'lifetime', 'admin']);

        const userRolesMap = new Map(
          (userRolesData || []).map((r: UserRole) => [r.user_id, r.role])
        );

        const enrichedData = data.map((prd: PRDDocument) => ({
          ...prd,
          user_name: prd.public_profiles?.name || 'Anônimo',
          username: prd.public_profiles?.username,
          avatar_url: prd.public_profiles?.avatar_url,
          user_role: userRolesMap.get(prd.user_id) || 'free',
          is_premium:
            userRolesMap.get(prd.user_id) === 'lifetime' ||
            userRolesMap.get(prd.user_id) === 'admin',
        }));

        // Append ou replace
        if (append) {
          setPrds(prev => [...prev, ...enrichedData]);
        } else {
          setPrds(enrichedData);
        }

        const endTime = performance.now();
        debugLog(`📊 Gallery query took ${(endTime - startTime).toFixed(2)}ms`);
      }
    } catch (error) {
      logger.error('Unexpected error:', error);
      toast.error('Erro inesperado ao carregar PRDs');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };
  const fetchHighlights = async () => {
    try {
      // OTIMIZAÇÃO: Paralelizar queries (3x mais rápido)
      const [likedResponse, remixedResponse, featuredResponse] = await Promise.all([
        // Mais curtido (all-time, sem filtro de data)
        supabase
          .from('document_history')
          .select(`*, public_profiles(name, username, avatar_url)`)
          .eq('is_public', true)
          .order('likes_count', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Mais remixado (all-time, apenas com remixes > 0)
        supabase
          .from('document_history')
          .select(`*, public_profiles(name, username, avatar_url)`)
          .eq('is_public', true)
          .gt('remixes_count', 0)
          .order('remixes_count', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Featured (escolha do editor)
        supabase
          .from('document_history')
          .select(`*, public_profiles(name, username, avatar_url)`)
          .eq('is_public', true)
          .eq('is_featured', true)
          .order('featured_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Buscar roles dos autores em batch (1 query após as 3 paralelas)
      const userIds = [
        likedResponse.data?.user_id,
        remixedResponse.data?.user_id,
        featuredResponse.data?.user_id,
      ].filter(Boolean);

      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', ['student', 'lifetime', 'admin']);

      const userRolesMap = new Map<string, boolean>();
      userRolesData?.forEach(ur => {
        userRolesMap.set(ur.user_id, true);
      });

      // Enriquecer com dados do autor
      const enrichHighlight = (data: PRDDocument | null): PRDDocument | null => {
        if (!data) return null;
        return {
          ...data,
          user_name: normalizeDisplayName(data.public_profiles?.name || 'Anônimo'),
          username: data.public_profiles?.username,
          avatar_url: data.public_profiles?.avatar_url,
          is_premium: userRolesMap.get(data.user_id) || false,
        };
      };
      setHighlights({
        mostLiked: enrichHighlight(likedResponse.data),
        mostRemixed: enrichHighlight(remixedResponse.data),
        featured: enrichHighlight(featuredResponse.data),
      });
    } catch (error) {
      logger.error('Error fetching highlights:', error);
    }
  };
  const applyFilters = () => {
    let filtered = [...prds];

    // Filtro de busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        prd =>
          prd.idea_preview.toLowerCase().includes(search) ||
          prd.full_document.toLowerCase().includes(search)
      );
    }

    // Nota: Ordenação já vem do backend via fetchPublicPRDs, não precisa re-ordenar aqui
    setFilteredPrds(filtered);
  };
  const { toggleLike, isLoading: isTogglingLike } = useToggleLike({
    onOptimisticUpdate: (prdId, isLiked, newCount) => {
      if (isLiked) {
        setUserLikes(prev => new Set(prev).add(prdId));
      } else {
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(prdId);
          return newSet;
        });
      }
      setPrds(
        prds.map(prd =>
          prd.id === prdId
            ? {
                ...prd,
                likes_count: newCount,
              }
            : prd
        )
      );
    },
    onSuccess: (prdId, isLiked, likesCount) => {
      setPrds(
        prds.map(prd =>
          prd.id === prdId
            ? {
                ...prd,
                likes_count: likesCount,
              }
            : prd
        )
      );
    },
    onError: (prdId, wasLiked, originalCount) => {
      // Rollback
      if (wasLiked) {
        setUserLikes(prev => new Set(prev).add(prdId));
      } else {
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(prdId);
          return newSet;
        });
      }
      setPrds(
        prds.map(prd =>
          prd.id === prdId
            ? {
                ...prd,
                likes_count: originalCount,
              }
            : prd
        )
      );
    },
  });

  const handleLike = async (prdId: string) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    const currentPRD = prds.find(p => p.id === prdId);
    if (!currentPRD) return;

    // Validação: não pode curtir próprio PRD
    if ((currentPRD as any).user_id === user.id) {
      toast.error('❌ Você não pode curtir seu próprio PRD');
      return;
    }

    const isCurrentlyLiked = userLikes.has(prdId);
    await toggleLike(prdId, isCurrentlyLiked, (currentPRD as any).likes_count);
  };
  const extractOriginalPrompt = (fullDocument: string): string => {
    // Tentar extrair o prompt original do documento
    const promptMatch = fullDocument.match(
      /(?:Prompt Original|Ideia Original|Briefing)[:\s]*([^\n]+)/i
    );
    if (promptMatch && promptMatch[1]) {
      return promptMatch[1].trim();
    }

    // Fallback: pegar primeiras linhas não vazias
    const lines = fullDocument.split('\n').filter(line => line.trim() !== '');
    return lines.slice(0, 3).join(' ').substring(0, 200);
  };
  const { executeRemix } = useToggleRemix();

  const handleRemix = async (prd: PRDDocument) => {
    await executeRemix(prd, user?.id);
  };
  const handleView = (prd: PRDDocument) => {
    // Usuários anônimos: Abrir preview com auth wall (30%)
    if (!user) {
      setSelectedPrd(prd);
      return;
    }

    // Usuários logados: Verificar premium
    if (prd.is_premium && !canViewPremium) {
      toast.error('🔒 Upgrade para Student para ver PRDs Premium');
      return;
    }

    // Só rastrear visualizações de outros usuários
    const isOwnPRD = user && prd.user_id === user.id;

    if (!isOwnPRD) {
      // Track view apenas se NÃO for o próprio PRD
      (async () => {
        try {
          await supabase.from('prd_analytics').insert({
            document_id: prd.id,
            event_type: 'view',
            user_id: user?.id || null,
          });
          await supabase.rpc('increment_views', {
            doc_id: prd.id,
          });
        } catch (error) {
          logger.error('Erro ao registrar view:', error);
        }
      })();
    }

    setSelectedPrd(prd);
  };
  const handleRequestAuth = () => {
    setPendingPrd(selectedPrd);
    setSelectedPrd(null);
    setShowAuthDialog(true);
  };
  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    if (pendingPrd) {
      setTimeout(() => {
        handleView(pendingPrd);
        setPendingPrd(null);
      }, 300);
    }
  };
  const toggleFeaturedFromGallery = async (prdId: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('document_history')
        .update({
          is_featured: newStatus,
          featured_at: newStatus ? new Date().toISOString() : null,
        })
        .eq('id', prdId);
      if (error) throw error;

      // Atualizar PRD localmente
      setPrds(prev =>
        prev.map(prd =>
          prd.id === prdId
            ? {
                ...prd,
                is_featured: newStatus,
                featured_at: newStatus ? new Date().toISOString() : null,
              }
            : prd
        )
      );

      // Atualizar selectedPrd se for o mesmo
      if (selectedPrd?.id === prdId) {
        setSelectedPrd({
          ...selectedPrd,
          is_featured: newStatus,
          featured_at: newStatus ? new Date().toISOString() : null,
        } as any);
      }

      // Recarregar highlights
      fetchHighlights();
      toast.success(newStatus ? '✨ Marcado como Escolha do Editor!' : 'Desmarcado como Featured');
    } catch (error) {
      logger.error('Error toggling featured:', error);
      toast.error('Erro ao atualizar status');
    }
  };
  return (
    <div className="min-h-screen bg-background">
      {/* TopBar Unificada */}
      <TopBar />

      {/* Header Hero */}
      <div>
        <div className="container mx-auto px-4 pt-20 pb-6 md:pt-[104px] md:pb-8">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight">
                GALERIA DE PRDs
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-bold">
                Explore ideias da comunidade, curta, remixe e crie seu próprio PRD
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 pt-4 pb-16 lg:pt-8 lg:pb-12">
        {/* MOBILE: Renderização condicional por tab */}
        <div className="lg:hidden">
          {activeTab === 'prds' && (
            <>
              {/* Filtros e Busca - MOBILE */}
              <div className="mb-6">
                <SearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  selectedCategory={category}
                  onCategoryChange={setCategory}
                  categories={[
                    {
                      id: 'all',
                      icon: '🌟',
                      label: 'Todas',
                    },
                    {
                      id: 'productivity',
                      icon: '📋',
                      label: 'Produtividade',
                    },
                    {
                      id: 'finance',
                      icon: '💰',
                      label: 'Finanças',
                    },
                    {
                      id: 'ai_automation',
                      icon: '🤖',
                      label: 'IA & Automação',
                    },
                    {
                      id: 'crm_business',
                      icon: '💼',
                      label: 'CRM & Negócios',
                    },
                    {
                      id: 'education',
                      icon: '📚',
                      label: 'Educação',
                    },
                    {
                      id: 'delivery',
                      icon: '🍕',
                      label: 'Delivery',
                    },
                    {
                      id: 'real_estate',
                      icon: '🏠',
                      label: 'Imobiliário',
                    },
                    {
                      id: 'marketplace',
                      icon: '🛍️',
                      label: 'Marketplace',
                    },
                    {
                      id: 'health',
                      icon: '🏥',
                      label: 'Saúde',
                    },
                    {
                      id: 'content',
                      icon: '🎨',
                      label: 'Conteúdo',
                    },
                    {
                      id: 'utilities',
                      icon: '🔧',
                      label: 'Utilidades',
                    },
                    {
                      id: 'other',
                      icon: '📦',
                      label: 'Outros',
                    },
                  ]}
                />
              </div>

              {/* Grid de PRDs */}
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <PRDCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredPrds.length === 0 ? (
                <EmptyState
                  icon={<Search className="h-16 w-16" />}
                  title="Nenhum PRD encontrado"
                  description={
                    searchTerm
                      ? `Não encontramos PRDs com "${searchTerm}"`
                      : 'Seja o primeiro a criar um PRD público!'
                  }
                  action={{
                    label: 'Criar PRD',
                    onClick: () => navigate('/'),
                    icon: <Plus className="mr-2 h-4 w-4" />,
                  }}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      {filteredPrds.length} PRD{filteredPrds.length !== 1 ? 's' : ''} encontrado
                      {filteredPrds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {filteredPrds.map(prd => (
                  <PRDCard
                    key={prd.id}
                    prd={prd as any}
                    isLiked={userLikes.has(prd.id)}
                    currentUserId={user?.id}
                    onView={() => handleView(prd)}
                    onLike={() => handleLike(prd.id)}
                    onRemix={() => handleRemix(prd)}
                      />
                    ))}
                  </div>

                  {/* Infinite Scroll Trigger - Mobile */}
                  {hasMore && !isLoading && (
                    <div ref={loadMoreRef} className="flex justify-center py-8">
                      {isLoadingMore && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-bold">Carregando mais PRDs...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensagem "fim da lista" */}
                  {!hasMore && prds.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm font-bold">🎉 Você viu todos os PRDs disponíveis!</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'creators' && <Leaderboard />}

          {activeTab === 'highlights' && (
            <HighlightsSection highlights={highlights} onView={handleView} />
          )}
        </div>

        {/* DESKTOP: Layout tradicional (tudo visível) */}
        <div className="hidden lg:block">
          {/* 1. Leaderboard */}
          <Leaderboard />

          {/* 2. Highlights */}
          <HighlightsSection highlights={highlights} onView={handleView} />

          {/* Separador Visual - Desktop Only */}
          <div className="relative py-8 mb-8">
            <Separator className="absolute top-1/2 left-0 right-0" />
            <div className="relative z-10 flex justify-center">
              <div className="bg-background px-6 py-2 border-2 border-foreground rounded-full shadow-lg">
                <p className="text-sm font-black uppercase text-muted-foreground">
                  📚 Explore a Galeria
                </p>
              </div>
            </div>
          </div>

          {/* 3. Filtros e Busca - DESKTOP */}
          <div className="py-6 mb-8">
            <CategoryFilter selected={category} onChange={setCategory} />

            <div className="mt-6">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectedCategory={category}
                onCategoryChange={setCategory}
                categories={[
                  {
                    id: 'all',
                    icon: '🌟',
                    label: 'Todas',
                  },
                  {
                    id: 'productivity',
                    icon: '📋',
                    label: 'Produtividade',
                  },
                  {
                    id: 'finance',
                    icon: '💰',
                    label: 'Finanças',
                  },
                  {
                    id: 'ai_automation',
                    icon: '🤖',
                    label: 'IA & Automação',
                  },
                  {
                    id: 'crm_business',
                    icon: '💼',
                    label: 'CRM & Negócios',
                  },
                  {
                    id: 'education',
                    icon: '📚',
                    label: 'Educação',
                  },
                  {
                    id: 'delivery',
                    icon: '🍕',
                    label: 'Delivery',
                  },
                  {
                    id: 'real_estate',
                    icon: '🏠',
                    label: 'Imobiliário',
                  },
                  {
                    id: 'marketplace',
                    icon: '🛍️',
                    label: 'Marketplace',
                  },
                  {
                    id: 'health',
                    icon: '🏥',
                    label: 'Saúde',
                  },
                  {
                    id: 'content',
                    icon: '🎨',
                    label: 'Conteúdo',
                  },
                  {
                    id: 'utilities',
                    icon: '🔧',
                    label: 'Utilidades',
                  },
                  {
                    id: 'other',
                    icon: '📦',
                    label: 'Outros',
                  },
                ]}
              />
            </div>
          </div>

          {/* 4. Grid de PRDs */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <PRDCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPrds.length === 0 ? (
            <EmptyState
              icon={<Search className="h-16 w-16" />}
              title="Nenhum PRD encontrado"
              description={
                searchTerm
                  ? `Não encontramos PRDs com "${searchTerm}"`
                  : 'Seja o primeiro a criar um PRD público!'
              }
              action={{
                label: 'Criar PRD',
                onClick: () => navigate('/'),
                icon: <Plus className="mr-2 h-4 w-4" />,
              }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {filteredPrds.length} PRD{filteredPrds.length !== 1 ? 's' : ''} encontrado
                  {filteredPrds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrds.map(prd => (
                <PRDCard
                  key={prd.id}
                  prd={prd as any}
                  isLiked={userLikes.has(prd.id)}
                  currentUserId={user?.id}
                  onView={() => handleView(prd)}
                    onLike={() => handleLike(prd.id)}
                    onRemix={() => handleRemix(prd)}
                  />
                ))}
              </div>

              {/* Infinite Scroll Trigger - Desktop */}
              {hasMore && !isLoading && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-bold">Carregando mais PRDs...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem "fim da lista" */}
              {!hasMore && prds.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm font-bold">🎉 Você viu todos os PRDs disponíveis!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Fixed (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border z-50 lg:hidden">
        <div className="grid grid-cols-3 gap-1.5 p-1.5">
          <button
            onClick={() => setActiveTab('creators')}
            className={cn(
              'flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all border-2 border-foreground',
              activeTab === 'creators'
                ? 'bg-accent text-accent-foreground'
                : 'bg-background text-foreground hover:bg-muted'
            )}
          >
            <Trophy className="h-4 w-4" />
            <span className="text-[11px] font-bold">Top</span>
          </button>

          <button
            onClick={() => setActiveTab('highlights')}
            className={cn(
              'flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all border-2 border-foreground',
              activeTab === 'highlights'
                ? 'bg-accent text-accent-foreground'
                : 'bg-background text-foreground hover:bg-muted'
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-bold">Destaques</span>
          </button>

          <button
            onClick={() => setActiveTab('prds')}
            className={cn(
              'flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all border-2 border-foreground',
              activeTab === 'prds'
                ? 'bg-accent text-accent-foreground'
                : 'bg-background text-foreground hover:bg-muted'
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="text-[11px] font-bold">PRDs</span>
          </button>
        </div>
      </div>

      {/* Modal de Preview */}
      <PRDPreviewModal
        prd={selectedPrd}
        open={!!selectedPrd}
        onClose={() => setSelectedPrd(null)}
        canViewPremium={canViewPremium}
        isAdmin={isAdmin}
        onToggleFeatured={toggleFeaturedFromGallery}
        isAnonymous={!user}
        onRequestAuth={handleRequestAuth}
      />

      {/* Modal de Autenticação */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-md">
          <WhatsAppAuth onSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
