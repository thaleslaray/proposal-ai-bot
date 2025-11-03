import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserRoleBadge } from '@/components/UserRoleBadge';
import { MapPin, Briefcase } from 'lucide-react';

interface ProfileHeaderProps {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  location?: string | null;
  occupation?: string | null;
  bio?: string | null;
}

export const ProfileHeader = ({
  userId,
  name,
  username,
  avatarUrl,
  location,
  occupation,
  bio,
}: ProfileHeaderProps) => {
  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <Avatar className="w-32 h-32 border-4 border-primary">
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback className="text-4xl font-bold">{initials}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-1">{name}</h1>
          <p className="text-lg text-muted-foreground">@{username}</p>
        </div>
        
        <UserRoleBadge userId={userId} showDescription />
        
        {(location || occupation) && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}
            {occupation && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                <span>{occupation}</span>
              </div>
            )}
          </div>
        )}
        
        {bio && (
          <p className="text-base leading-relaxed max-w-2xl">{bio}</p>
        )}
      </div>
    </div>
  );
};
