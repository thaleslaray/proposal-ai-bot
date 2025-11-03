import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const AdminHeader = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3 md:gap-4">
        <h1 className="text-base md:text-xl font-black text-[#0a0a0a] truncate uppercase tracking-wider">Painel Admin</h1>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
          className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal text-[#0a0a0a] font-bold"
        >
          <ArrowLeft className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline uppercase tracking-wide">Voltar</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal text-[#0a0a0a] font-bold"
        >
          <LogOut className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline uppercase tracking-wide">Sair</span>
        </Button>
      </div>
    </div>
  );
};
