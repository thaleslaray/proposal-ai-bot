import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { FileText, Zap } from 'lucide-react';

interface UsageCounterProps {
  onUpgradeClick?: () => void;
  inline?: boolean;
}

export const UsageCounter = ({ onUpgradeClick, inline = false }: UsageCounterProps) => {
  const { user, isStudent, isLifetime, isAdmin, currentEvent, eventLimit } = useAuth();
  const [usage, setUsage] = useState(0);
  const [limit, setLimit] = useState(1);

  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    
    // Buscar limite dinâmico do backend
    const fetchLimit = async () => {
      const { data, error } = await supabase.rpc('get_prd_limit', {
        _user_id: user.id
      });
      
      if (!error && data !== null) {
        const limitValue = data as number;
        setLimit(limitValue === -1 ? Infinity : limitValue);
      } else {
        // Fallback
        if (isAdmin || isLifetime) {
          setLimit(Infinity);
        } else {
          setLimit(isStudent ? 2 : 1);
        }
      }
    };
    
    fetchLimit();
    
    // Buscar uso nas últimas 24h
    const fetchUsage = async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('api_usage')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('endpoint', 'generate-prd')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setUsage(data.length);
        
        // Calcular tempo até reset baseado no primeiro uso
        if (data.length > 0) {
          const firstUsageTime = new Date(data[0].created_at).getTime();
          const resetTime = firstUsageTime + 24 * 60 * 60 * 1000;
          
          const updateTimer = () => {
            const now = Date.now();
            const diff = resetTime - now;
            
            if (diff <= 0) {
              setTimeUntilReset('Agora!');
              fetchUsage(); // Recarregar uso
            } else {
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              setTimeUntilReset(`${hours}h ${minutes}min`);
            }
          };
          
          updateTimer();
          const timerInterval = setInterval(updateTimer, 60000);
          return () => clearInterval(timerInterval);
        }
      }
    };
    
    fetchUsage();
    fetchLimit();
    
    // Atualizar a cada minuto
    const interval = setInterval(() => {
      fetchUsage();
      fetchLimit();
    }, 60000);
    return () => clearInterval(interval);
    
  }, [user, isStudent, isLifetime, isAdmin]);

  // Se está em evento com limite infinito, mostrar badge especial
  if (currentEvent && eventLimit === -1) {
    return (
      <div className={inline ? "flex items-center gap-2" : "w-full"}>
        <Badge variant="default" className="bg-accent text-accent-foreground border-4 border-foreground shadow-brutal flex items-center gap-1.5 px-4 py-2 font-black uppercase tracking-wider">
          <Zap className="w-4 h-4" />
          <span>EVENTO: GERAÇÕES ILIMITADAS! 🎉</span>
        </Badge>
      </div>
    );
  }

  // Se é admin, lifetime ou tem limite infinito (mas não está em evento), não mostrar
  if (!user || isAdmin || isLifetime || limit === Infinity) return null;

  const isLimitReached = usage >= limit;
  const percentage = (usage / limit) * 100;

  // Versão inline elegante (baseada no card original)
  if (inline) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {/* Linha 1: Header com Ícone + Título + Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold">Documentos Hoje:</span>
          </div>
          <Badge 
            variant={isLimitReached ? 'destructive' : 'default'} 
            className="text-xs"
          >
            {usage}/{limit === Infinity ? '∞' : limit}
          </Badge>
        </div>
        
        {/* Linha 2: Barra de progresso completa */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${isLimitReached ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        
        {/* Linha 3: Mensagens (só quando limite atingido) */}
        {isLimitReached && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <span>⏱️ Limite atingido. Faça upgrade!</span>
            </span>
            <button
              onClick={onUpgradeClick}
              className="text-primary font-bold"
            >
              👆 Clique aqui
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={isLimitReached ? onUpgradeClick : undefined}
      disabled={!isLimitReached}
      className={`w-full border-brutal bg-card p-4 sm:p-5 md:p-6 shadow-brutal transition-all ${
        isLimitReached 
          ? 'cursor-pointer hover:shadow-brutal-hover hover:scale-[1.02] active:scale-[0.98]' 
          : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">Documentos Hoje:</span>
        </div>
        
        <Badge variant={isLimitReached ? 'destructive' : 'default'} className="text-xs sm:text-sm">
          {usage}/{limit === Infinity ? '∞' : limit}
        </Badge>
      </div>
      
      <div className="mt-3 sm:mt-4 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${isLimitReached ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    
    {isLimitReached && (
      <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-1">
            <span>⏱️ Limite atingido. Faça upgrade!</span>
            <span className="text-primary font-bold">👆 Clique aqui</span>
          </p>
          {timeUntilReset && (
            <p className="text-[10px] sm:text-xs font-bold text-center">
              🕐 Reinicia em: <span className="text-primary">{timeUntilReset}</span>
            </p>
          )}
        </div>
      )}
    </button>
  );
};
