import { useEffect, useState } from 'react';
import { PRDDocument } from '@/types';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PRDDocument } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { PRDDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PRDDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { PRDDocument } from '@/types';
import { Card } from '@/components/ui/card';
import { PRDDocument } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRDDocument } from '@/types';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PRDDocument } from '@/types';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { PRDDocument } from '@/types';
import { ProfileBadges } from '@/components/profile/ProfileBadges';
import { PRDDocument } from '@/types';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { PRDDocument } from '@/types';
import { ProfileShareButton } from '@/components/profile/ProfileShareButton';
import { PRDDocument } from '@/types';
import { PRDCard } from '@/components/community/PRDCard';
import { PRDDocument } from '@/types';
import { PRDPreviewModal } from '@/components/community/PRDPreviewModal';
import { PRDDocument } from '@/types';
import { LoadingState } from '@/components/states/LoadingState';
import { PRDDocument } from '@/types';
import { ErrorState } from '@/components/states/ErrorState';
import { PRDDocument } from '@/types';
import { EmptyState } from '@/components/states/EmptyState';
import { PRDDocument } from '@/types';
import { PageContainer } from '@/components/layout/PageContainer';
import { PRDDocument } from '@/types';
import { ArrowLeft, Edit, Mail, Globe, FileText, Plus } from 'lucide-react';
import { PRDDocument } from '@/types';
import { trackSocialClick } from '@/utils/profileAnalytics';
import { PRDDocument } from '@/types';
import { toast } from 'sonner';
import { PRDDocument } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PRDDocument } from '@/types';
import { WhatsAppAuth } from '@/components/WhatsAppAuth';
import { PRDDocument } from '@/types';
import { useToggleLike } from '@/hooks/useToggleLike';
import { PRDDocument } from '@/types';
import { useToggleRemix } from '@/hooks/useToggleRemix';
import { PRDDocument } from '@/types';
import { logger } from '@/lib/logger';
import { PRDDocument } from '@/types';

interface SocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

interface ProfileData {
  id: string;
  name: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  occupation?: string | null;
  email?: string | null;
  website?: string | null;
  show_email?: boolean;
  social_links?: SocialLinks;
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({
    prdsCreated: 0,
    totalLikes: 0,
    totalRemixes: 0,
    totalViews: 0,
  });
  const [badges, setBadges] = useState<PRDDocument[]>([]);
  const [userPRDs, setUserPRDs] = useState<PRDDocument[]>([]);
  const [selectedPRD, setSelectedPRD] = useState<PRDDocument | null>(null);
  const [likedPRDs, setLikedPRDs] = useState<Set<string>>(new Set());
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingPRD, setPendingPRD] = useState<PRDDocument | null>(null);

  const handleViewPRD = (prd: PRDDocument) => {
    if (!user) {
      setSelectedPRD(prd);
      return;
    }

    const isOwnPRD = user && (prd as any).user_id === user.id;

    if (!isOwnPRD) {
      supabase.from('prd_analytics').insert({
        document_id: prd.id,
        event_type: 'view',
        user_id: user.id,
      });

      supabase.rpc('increment_views', { doc_id: prd.id });
    }

    setSelectedPRD(prd);
  };

  const { toggleLike, isLoading: isTogglingLike } = useToggleLike({
    onOptimisticUpdate: (prdId, isLiked, newCount) => {
      if (isLiked) {
        setLikedPRDs(prev => new Set(prev).add(prdId));
      } else {
        setLikedPRDs(prev => {
          const newSet = new Set(prev);
          newSet.delete(prdId);
          return newSet;
        });
      }
      setUserPRDs(prev => prev.map(p => (p.id === prdId ? { ...p, likes_count: newCount } : p)));
    },
    onSuccess: (prdId, isLiked, likesCount) => {
      setUserPRDs(prev => prev.map(p => (p.id === prdId ? { ...p, likes_count: likesCount } : p)));
    },
    onError: (prdId, wasLiked, originalCount) => {
      if (wasLiked) {
        setLikedPRDs(prev => new Set(prev).add(prdId));
      } else {
        setLikedPRDs(prev => {
          const newSet = new Set(prev);
          newSet.delete(prdId);
          return newSet;
        });
      }
      setUserPRDs(prev =>
        prev.map(p => (p.id === prdId ? { ...p, likes_count: originalCount } : p))
      );
    },
  });

  const handleLikePRD = async (prdId: string) => {
    if (!user) {
      toast.error('Faça login para curtir');
      return;
    }

    const currentPRD = userPRDs.find(p => p.id === prdId);
    if (!currentPRD) return;

    if ((currentPRD as any).user_id === user.id) {
      toast.error('❌ Você não pode curtir seu próprio PRD');
      return;
    }

    const wasLiked = likedPRDs.has(prdId);
    await toggleLike(prdId, wasLiked, (currentPRD as any).likes_count);
  };

  const { executeRemix } = useToggleRemix();

  const handleRemixPRD = async (prd: PRDDocument) => {
    await executeRemix(prd as any, user?.id);
  };

  const handleRequestAuth = () => {
    setPendingPRD(selectedPRD);
    setSelectedPRD(null);
    setShowAuthDialog(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);

    if (pendingPRD) {
      setTimeout(() => {
        handleViewPRD(pendingPRD);
        setPendingPRD(null);
      }, 300);
    }
  };

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('profile-likes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_history',
          filter: `user_id=eq.${profile.id}`,
        },
        payload => {
          setUserPRDs(prev =>
            prev.map(prd =>
              prd.id === payload.new.id ? { ...prd, likes_count: payload.new.likes_count } : prd
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('public_profiles')
        .select('*')
        .ilike('username', username!)
        .maybeSingle();

      if (profileError || !profileData) {
        setError('Usuário não encontrado');
        return;
      }

      setProfile(profileData as any);

      const { data: prds } = await supabase
        .from('document_history')
        .select('id, likes_count, remixes_count, view_count')
        .eq('user_id', profileData.id)
        .eq('is_public', true);

      if (prds) {
        setStats({
          prdsCreated: prds.length,
          totalLikes: prds.reduce((sum, prd) => sum + (prd.likes_count || 0), 0),
          totalRemixes: prds.reduce((sum, prd) => sum + (prd.remixes_count || 0), 0),
          totalViews: prds.reduce((sum, prd) => sum + (prd.view_count || 0), 0),
        });
      }

      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', profileData.id);

      if (badgesData) setBadges(badgesData as any);

      const { data: prdsData } = await supabase
        .from('document_history')
        .select('*, public_profiles!inner(name, username, avatar_url)')
        .eq('user_id', profileData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (prdsData) {
        const enrichedPRDs = prdsData.map((prd: any) => ({
          ...prd,
          user_name: (prd as any).public_profiles?.name,
          username: (prd as any).public_profiles?.username,
          avatar_url: (prd as any).public_profiles?.avatar_url,
        }));
        setUserPRDs(enrichedPRDs);
      }
    } catch (error) {
      logger.error('Error fetching profile:', error);
      setError('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = (platform: string) => {
    if (profile) {
      trackSocialClick(profile.id, platform, user?.id);
    }
  };

  if (loading) {
    return <LoadingState variant="fullscreen" message="Carregando perfil..." />;
  }

  if (error || !profile) {
    return (
      <ErrorState
        title="Usuário não encontrado"
        message={error || 'O perfil que você procura não existe'}
        onRetry={() => navigate('/galeria')}
        variant="fullscreen"
      />
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-background">
      <PageContainer maxWidth="lg">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {isOwnProfile && (
            <Button asChild>
              <Link to="/editar-perfil">
                <Edit className="w-4 h-4 mr-2" />
                Editar Perfil
              </Link>
            </Button>
          )}
        </div>

        {/* Profile Header */}
        <Card className="p-6 md:p-8 mb-8">
          <ProfileHeader
            userId={profile.id}
            name={profile.name}
            username={profile.username}
            avatarUrl={profile.avatar_url}
            location={profile.location}
            occupation={profile.occupation}
            bio={profile.bio}
          />

          {/* Contact & Social Links */}
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            {profile.show_email && profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail className="w-4 h-4" />
                {profile.email}
              </a>
            )}

            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}

            {profile.social_links && (
              <SocialLinks links={profile.social_links} size="md" onLinkClick={handleSocialClick} />
            )}

            <ProfileShareButton username={profile.username} name={profile.name} />
          </div>
        </Card>

        {/* Stats */}
        <div className="mb-8">
          <ProfileStats
            prdsCreated={stats.prdsCreated}
            totalLikes={stats.totalLikes}
            totalRemixes={stats.totalRemixes}
            totalViews={stats.totalViews}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="prds" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="prds">PRDs Criados</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="prds" className="mt-6">
            {userPRDs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userPRDs.map(prd => (
                <PRDCard
                  key={prd.id}
                  prd={prd as any}
                  isLiked={likedPRDs.has(prd.id)}
                  currentUserId={user?.id}
                  onView={() => handleViewPRD(prd)}
                  onLike={() => handleLikePRD(prd.id)}
                  onRemix={() => handleRemixPRD(prd)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="h-16 w-16" />}
                title="Nenhum PRD público ainda"
                description={
                  isOwnProfile
                    ? 'Crie seu primeiro PRD e torne-o público para aparecer aqui'
                    : `${profile.name} ainda não criou PRDs públicos`
                }
                action={
                  isOwnProfile
                    ? {
                        label: 'Criar PRD',
                        onClick: () => navigate('/'),
                        icon: <Plus className="mr-2 h-4 w-4" />,
                      }
                    : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <Card className="p-6">
              <ProfileBadges badges={badges as any} />
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Estatísticas Detalhadas</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de PRDs criados</span>
                  <span className="font-bold text-xl">{stats.prdsCreated}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Likes recebidos</span>
                  <span className="font-bold text-xl">{stats.totalLikes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Remixes recebidos</span>
                  <span className="font-bold text-xl">{stats.totalRemixes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Visualizações totais</span>
                  <span className="font-bold text-xl">{stats.totalViews}</span>
                </div>
                {stats.prdsCreated > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Média de likes por PRD</span>
                      <span className="font-bold text-xl">
                        {(stats.totalLikes / stats.prdsCreated).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Média de views por PRD</span>
                      <span className="font-bold text-xl">
                        {(stats.totalViews / stats.prdsCreated).toFixed(1)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* PRD Preview Modal */}
        <PRDPreviewModal
          prd={selectedPRD as any}
          open={!!selectedPRD}
          onClose={() => setSelectedPRD(null)}
          canViewPremium={true}
          isAnonymous={!user}
          onRequestAuth={handleRequestAuth}
        />

        {/* Auth Dialog */}
        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="max-w-md">
            <WhatsAppAuth onSuccess={handleAuthSuccess} />
          </DialogContent>
        </Dialog>
      </PageContainer>
    </div>
  );
}
