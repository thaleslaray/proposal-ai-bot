import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ArrowLeft, Save } from 'lucide-react';
import { uploadAvatar } from '@/lib/avatarUpload';
import { sanitizeBio, sanitizeUsername, sanitizeText } from '@/lib/sanitize';
import { normalizeDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

interface ProfileData {
  username?: string;
  name?: string;
  bio?: string;
  occupation?: string;
  location?: string;
  website?: string;
  show_email?: boolean;
  social_links?: SocialLinks;
  avatar_url?: string;
}

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username deve ter no mínimo 3 caracteres')
    .max(20, 'Username deve ter no máximo 20 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  bio: z.string().max(500, 'Bio não pode ter mais de 500 caracteres').optional(),
  occupation: z.string().max(100, 'Ocupação muito longa').optional(),
  location: z.string().max(100, 'Localização muito longa').optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  show_email: z.boolean(),
  linkedin: z.string().url('URL inválida').optional().or(z.literal('')),
  github: z.string().url('URL inválida').optional().or(z.literal('')),
  twitter: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram: z.string().url('URL inválida').optional().or(z.literal('')),
  youtube: z.string().url('URL inválida').optional().or(z.literal('')),
  tiktok: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ProfileData | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const showEmail = watch('show_email');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching profile:', error);
        toast.error('Erro ao carregar perfil');
        setLoading(false);
        return;
      }

      if (!data) {
        toast.info('🎯 Crie seu primeiro PRD para completar seu perfil!');
        navigate('/');
        return;
      }

      setCurrentProfile(data as any);

      // Populate form
      setValue('username', data.username || '');
      setValue('name', data.name || '');
      setValue('bio', data.bio || '');
      setValue('occupation', data.occupation || '');
      setValue('location', data.location || '');
      setValue('website', data.website || '');
      setValue('show_email', data.show_email || false);

      // Social links
      const socialLinks: any = data.social_links || {};
      setValue('linkedin', socialLinks.linkedin || '');
      setValue('github', socialLinks.github || '');
      setValue('twitter', socialLinks.twitter || '');
      setValue('instagram', socialLinks.instagram || '');
      setValue('youtube', socialLinks.youtube || '');
      setValue('tiktok', socialLinks.tiktok || '');
    } catch (error) {
      logger.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }, [user, setValue, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      navigate('/');
    }
  }, [user, fetchProfile, navigate]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSaving(true);

      // Sanitizar inputs
      const sanitizedUsername = sanitizeUsername(data.username);
      const sanitizedBio = data.bio ? sanitizeBio(data.bio) : null;
      const sanitizedName = normalizeDisplayName(sanitizeText(data.name, 100));

      // Verificar se username já existe (exceto o próprio)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', sanitizedUsername)
        .neq('id', user!.id)
        .maybeSingle();

      if (existingUser) {
        toast.error('Username já está em uso');
        return;
      }

      // Upload avatar se foi selecionado
      let avatarUrl = currentProfile.avatar_url;
      if (selectedAvatarFile) {
        avatarUrl = await uploadAvatar(selectedAvatarFile, user!.id);
      }

      // Preparar social links
      const socialLinks = {
        linkedin: data.linkedin || null,
        github: data.github || null,
        twitter: data.twitter || null,
        instagram: data.instagram || null,
        youtube: data.youtube || null,
        tiktok: data.tiktok || null,
      };

      // Atualizar perfil
      const { error } = await supabase
        .from('profiles')
        .update({
          username: sanitizedUsername,
          name: sanitizedName,
          bio: sanitizedBio,
          occupation: data.occupation || null,
          location: data.location || null,
          website: data.website || null,
          show_email: data.show_email,
          social_links: socialLinks,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      navigate(`/u/${sanitizedUsername}`);
    } catch (error: any) {
      logger.error('Error updating profile:', error);
      toast.error(error?.message || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="outline" asChild>
            <Link to={currentProfile?.username ? `/u/${currentProfile.username}` : '/galeria'}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Editar Perfil</h1>
          <div className="w-24" /> {/* Spacer for alignment */}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Avatar Section */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Foto de Perfil</h2>
                <AvatarUpload
                  currentAvatarUrl={currentProfile?.avatar_url}
                  userName={currentProfile?.name || 'User'}
                  onFileSelect={file => setSelectedAvatarFile(file)}
                  onRemove={() => setSelectedAvatarFile(null)}
                />
              </Card>

              {/* Basic Info */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Informações Básicas</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input id="username" {...register('username')} placeholder="seunome" />
                    {errors.username && (
                      <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input id="name" {...register('name')} placeholder="Seu Nome" />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      {...register('bio')}
                      placeholder="Conte um pouco sobre você..."
                      rows={4}
                      maxLength={500}
                    />
                    {errors.bio && (
                      <p className="text-sm text-red-500 mt-1">{errors.bio.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="occupation">Ocupação</Label>
                    <Input
                      id="occupation"
                      {...register('occupation')}
                      placeholder="Product Manager, Designer, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Localização</Label>
                    <Input id="location" {...register('location')} placeholder="São Paulo, SP" />
                  </div>
                </div>
              </Card>

              {/* Contact */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Contato</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mostrar Email no Perfil</Label>
                      <p className="text-sm text-muted-foreground">
                        {(currentProfile as any)?.email || 'Nenhum email cadastrado'}
                      </p>
                    </div>
                    <Switch
                      checked={showEmail}
                      onCheckedChange={checked => setValue('show_email', checked)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      {...register('website')}
                      placeholder="https://seusite.com"
                      type="url"
                    />
                    {errors.website && (
                      <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Social Links */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Redes Sociais</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      {...register('linkedin')}
                      placeholder="https://linkedin.com/in/usuario"
                      type="url"
                    />
                  </div>

                  <div>
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      {...register('github')}
                      placeholder="https://github.com/usuario"
                      type="url"
                    />
                  </div>

                  <div>
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      {...register('twitter')}
                      placeholder="https://twitter.com/usuario"
                      type="url"
                    />
                  </div>

                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      {...register('instagram')}
                      placeholder="https://instagram.com/usuario"
                      type="url"
                    />
                  </div>

                  <div>
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      {...register('youtube')}
                      placeholder="https://youtube.com/@usuario"
                      type="url"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      {...register('tiktok')}
                      placeholder="https://tiktok.com/@usuario"
                      type="url"
                    />
                  </div>
                </div>
              </Card>

              <Button type="submit" disabled={saving} size="lg" className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-8">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground">PREVIEW</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Assim seu perfil ficará visível
                </p>
                {/* Preview content can be added here */}
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
