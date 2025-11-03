import { Button } from '@/components/ui/button';
import { Linkedin, Github, Twitter, Instagram, Youtube } from 'lucide-react';

interface SocialLinksProps {
  links: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  onLinkClick?: (platform: string) => void;
}

export const SocialLinks = ({ links, size = 'md', onLinkClick }: SocialLinksProps) => {
  const socials = [
    { key: 'linkedin', icon: Linkedin, color: 'text-blue-600 dark:text-blue-400', label: 'LinkedIn' },
    { key: 'github', icon: Github, color: 'text-gray-800 dark:text-gray-200', label: 'GitHub' },
    { key: 'twitter', icon: Twitter, color: 'text-sky-500 dark:text-sky-400', label: 'Twitter' },
    { key: 'instagram', icon: Instagram, color: 'text-pink-600 dark:text-pink-400', label: 'Instagram' },
    { key: 'youtube', icon: Youtube, color: 'text-red-600 dark:text-red-400', label: 'YouTube' },
  ];

  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6';
  
  const activeSocials = socials.filter(({ key }) => links[key as keyof typeof links]);
  
  if (activeSocials.length === 0) return null;
  
  return (
    <div className="flex gap-2 flex-wrap">
      {activeSocials.map(({ key, icon: Icon, color, label }) => (
        <Button
          key={key}
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          asChild
          className="hover:scale-110 transition-transform"
        >
          <a 
            href={links[key as keyof typeof links]} 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label={label}
            onClick={() => onLinkClick?.(key)}
          >
            <Icon className={`${iconSize} ${color}`} />
          </a>
        </Button>
      ))}
    </div>
  );
};
