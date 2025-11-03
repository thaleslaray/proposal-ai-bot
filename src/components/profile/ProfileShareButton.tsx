import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileShareButtonProps {
  username: string;
  name: string;
}

export const ProfileShareButton = ({ username, name }: ProfileShareButtonProps) => {
  const url = `${window.location.origin}/u/${username}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('🔗 Link do perfil copiado!');
  };
  
  return (
    <Button 
      variant="outline" 
      size="default" 
      className="hover:scale-110 transition-transform"
      onClick={copyLink}
    >
      <Share2 className="h-5 w-5 mr-2" />
      Compartilhar
    </Button>
  );
};
