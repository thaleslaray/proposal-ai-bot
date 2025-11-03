import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonsProps {
  prd: {
    id: string;
    idea_preview: string;
  };
}

export const ShareButtons = ({ prd }: ShareButtonsProps) => {
  const url = `${window.location.origin}/galeria?prd=${prd.id}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('🔗 Link copiado!');
  };
  
  return (
    <Button variant="outline" size="icon" onClick={copyLink}>
      <Share2 className="h-4 w-4" />
    </Button>
  );
};
