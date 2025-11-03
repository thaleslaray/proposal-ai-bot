import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/lib/logger';

interface UserProfileButtonProps {
  userId: string;
  userName?: string;
}

export const UserProfileButton = ({ userId, userName }: UserProfileButtonProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    username?: string;
    avatar_url?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          logger.error('Error fetching profile:', error);
        } else if (data) {
          setProfile(data);
        }
      } catch (error) {
        logger.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleClick = () => {
    if (profile?.username) {
      navigate(`/u/${profile.username}`);
    } else {
      navigate('/editar-perfil');
    }
  };

  const initials =
    userName
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  if (loading) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className="h-6 w-6 hover:bg-accent/10 touch-manipulation rounded-full p-0"
          >
            {profile?.avatar_url ? (
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile.avatar_url} alt={userName} />
                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-3 w-3 text-accent" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{profile?.username ? 'Ver Perfil' : 'Criar Perfil'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
