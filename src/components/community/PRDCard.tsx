import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heart, RefreshCw, Eye, X, Lightbulb, Sparkles, Bike, Briefcase, GraduationCap, Activity, ShoppingBag, Gamepad2, Home, DollarSign, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGradientFromSeed } from '@/utils/gradientGenerator';
import { extractPRDData } from '@/utils/prdExtractor';
import { ShareButtons } from './ShareButtons';
import { UserRoleBadge } from '@/components/UserRoleBadge';
import { normalizeDisplayName } from '@/lib/utils';

interface PRDCardProps {
  prd: {
    id: string;
    idea_preview: string;
    description?: string;
    full_document: string;
    category: string;
    likes_count: number;
    remixes_count: number;
    view_count?: number;
    is_premium: boolean;
    created_at: string;
    user_name?: string;
    user_id: string;
    username?: string;
    avatar_url?: string;
  };
  isLiked?: boolean;
  currentUserId?: string;
  onView: () => void;
  onLike: () => void;
  onRemix: () => void;
}

export const PRDCard = ({ prd, isLiked = false, currentUserId, onView, onLike, onRemix }: PRDCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { tags, complexity, sections } = extractPRDData(prd.full_document);
  const title = prd.idea_preview; // Usar o título sintético do banco
  const isOwnPRD = currentUserId === prd.user_id;
  
  // Usar descrição do banco ou fallback para extração manual
  const description = prd.description || 
    (sections.problema 
      ? sections.problema.substring(0, 120) + (sections.problema.length > 120 ? '...' : '')
      : prd.full_document.substring(0, 120) + '...');
  
  const gradient = getGradientFromSeed(prd.id, prd.category);
  
  const categoryIcons = {
    delivery: <Bike className="w-8 h-8" />,
    b2b: <Briefcase className="w-8 h-8" />,
    education: <GraduationCap className="w-8 h-8" />,
    health: <Activity className="w-8 h-8" />,
    marketplace: <ShoppingBag className="w-8 h-8" />,
    entertainment: <Gamepad2 className="w-8 h-8" />,
    real_estate: <Home className="w-8 h-8" />,
    finance: <DollarSign className="w-8 h-8" />,
    other: <Package className="w-8 h-8" />
  };
  
  // Verificar se o PRD foi criado nas últimas 24h
  const isNew = new Date().getTime() - new Date(prd.created_at).getTime() < 24 * 60 * 60 * 1000;
  
  return (
    <Card 
      className="relative overflow-hidden rounded-lg border-brutal bg-card shadow-brutal hover:shadow-brutal-hover hover:-translate-y-1 transition-brutal group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`PRD: ${title}`}
    >
      
      {/* Header Compacto Mobile */}
      <div className="sm:hidden flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-background border-2 shrink-0"
            style={{ 
              borderColor: gradient.match(/#[0-9A-F]{6}/gi)?.[0] || 'hsl(var(--border))' 
            }}
          >
            <div className="scale-75">
              {categoryIcons[prd.category as keyof typeof categoryIcons] || <Package className="w-8 h-8" />}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold line-clamp-1 leading-tight">
              {title}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {['', 'Básico', 'Detalhado', 'Completo', 'Profundo', 'Extenso'][complexity]}
              </Badge>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Heart className="w-2.5 h-2.5" />
                {prd.likes_count}
              </span>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={onView} className="shrink-0 h-8 text-xs bg-primary hover:bg-accent">
          Ver
        </Button>
      </div>
      
      {/* Conteúdo Desktop (oculto em mobile) */}
      <div className="hidden sm:block relative p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
        {/* Header: Badge unificado (prioridade: Novo > Premium) */}
        <div className="absolute top-4 right-4">
          {isNew ? (
            <Badge variant="default" className="bg-green-500 text-white font-black border-2 border-foreground animate-pulse">
              🆕 NOVO
            </Badge>
          ) : prd.is_premium ? (
            <Badge variant="premium" className="font-black border-2 border-purple-700">
              ⭐ PREMIUM
            </Badge>
          ) : null}
        </div>
        
        {/* Ícone da Categoria em círculo colorido */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div 
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-background border-2"
            style={{ 
              borderColor: gradient.match(/#[0-9A-F]{6}/gi)?.[0] || 'hsl(var(--border))' 
            }}
          >
            {categoryIcons[prd.category as keyof typeof categoryIcons] || <Package className="w-8 h-8" />}
          </div>
        </div>
        
        {/* Título */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 sm:mb-3 line-clamp-2 min-h-[3rem] sm:min-h-[3.5rem] leading-tight">
          {title}
        </h3>
        
        {/* Descrição útil */}
        <p className="text-sm text-muted-foreground/90 mb-3 sm:mb-4 line-clamp-3 h-[4.5rem] leading-relaxed overflow-hidden">
          {description}
        </p>
        
        {/* CTA Principal - MOVIDO PARA CIMA */}
        <Button 
          variant="brutal" 
          size="lg"
          className="w-full text-base md:text-lg font-black uppercase tracking-wide mb-3 sm:mb-4 bg-primary hover:bg-accent border-brutal shadow-brutal hover:shadow-brutal-hover" 
          onClick={onView}
          aria-label="Ver documento completo do PRD"
        >
          <Eye className="w-5 h-5 mr-2" />
          VER PRD COMPLETO
        </Button>
        
        {/* Tags - MAIORES e limitadas */}
        <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4 min-h-[1.5rem]">
          {tags.slice(0, 4).map(tag => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs px-2.5 py-0.5 border-border/40 hover:border-primary/50 transition-colors"
            >
              #{tag}
            </Badge>
          ))}
          {tags.length > 4 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 opacity-50">
              +{tags.length - 4}
            </Badge>
          )}
        </div>
        
        {/* Barra de Complexidade com cores progressivas */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Nível de Detalhamento:</span>
            <span className="text-xs font-bold text-primary">
              {['', 'Básico', 'Detalhado', 'Completo', 'Profundo', 'Extenso'][complexity]}
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(level => {
              const colors = ['', 'bg-green-500', 'bg-green-400', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
              return (
                <div
                  key={level}
                  className={`h-2 flex-1 rounded transition-all ${
                    level <= complexity ? colors[complexity] : 'bg-muted'
                  }`}
                />
              );
            })}
          </div>
        </div>
        
        {/* Autor com Avatar + Badge */}
        {prd.user_name && (
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/30">
            <Avatar className="w-6 h-6">
              <AvatarImage src={prd.avatar_url} alt={prd.user_name} />
              <AvatarFallback className="text-[10px] bg-primary/10">
                {prd.user_name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {prd.username ? (
              <Link to={`/u/${prd.username}`}>
                <p className="text-xs font-medium hover:text-primary transition-colors">
                  {normalizeDisplayName(prd.user_name)}
                </p>
              </Link>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">
                {normalizeDisplayName(prd.user_name)}
              </p>
            )}
            <UserRoleBadge userId={prd.user_id} size="sm" />
          </div>
        )}
        
        {/* Stats Compactadas com Lucide Icons */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-b border-border/30 py-2 mb-3 sm:mb-4">
          <span className="flex items-center gap-1" title="Curtidas">
            <Heart className="w-3 h-3" />
            {prd.likes_count}
          </span>
          <span className="text-border/50">•</span>
          <span className="flex items-center gap-1" title="Remixes">
            <RefreshCw className="w-3 h-3" />
            {prd.remixes_count}
          </span>
          <span className="text-border/50">•</span>
          <span className="flex items-center gap-1" title="Visualizações">
            <Eye className="w-3 h-3" />
            {prd.view_count || 0}
          </span>
          <span className="ml-auto text-[10px]">
            {formatDistanceToNow(new Date(prd.created_at), { 
              locale: ptBR,
              addSuffix: true 
            })}
          </span>
        </div>
        
        {/* Ações Secundárias - agora no rodapé */}
        <div className="flex justify-center items-center gap-2 pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onLike}
                  className={isLiked ? 'text-red-500' : ''}
                  aria-label={isLiked ? 'Remover curtida' : 'Curtir PRD'}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isLiked ? 'Remover curtida' : 'Curtir PRD'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onRemix}
                  aria-label={isOwnPRD ? 'Criar nova versão' : 'Fazer remix'}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isOwnPRD ? 'Criar nova versão' : 'Fazer remix'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <ShareButtons prd={prd} />
        </div>
        
        {/* Preview Otimizado no Hover - 60% superior */}
        {isHovered && sections.problema && (
          <div className="absolute top-0 left-0 right-0 h-3/5 bg-gradient-to-b from-card via-card/98 to-transparent backdrop-blur-sm p-4 sm:p-6 animate-in slide-in-from-top-4 duration-300 overflow-y-auto">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsHovered(false);
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center transition-colors z-10"
              aria-label="Fechar prévia"
            >
              <X className="w-3 h-3" />
            </button>
            
            <div className="space-y-2 sm:space-y-3">
              <div>
                <h4 className="font-bold text-xs mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Problema
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {sections.problema}
                </p>
              </div>
              {sections.solucao && (
                <div>
                  <h4 className="font-bold text-xs mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Solução
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {sections.solucao}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Conteúdo Mobile Colapsável */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="sm:hidden">
        <div className="px-3 py-2">
          <CollapsibleTrigger className="w-full text-left">
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
              {description}
            </p>
            <div className="flex items-center justify-center gap-1 text-[10px] text-primary">
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Ver mais
                </>
              )}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 pt-2">
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
            
            {/* Autor */}
            {prd.user_name && (
              <div className="flex items-center gap-1.5 pb-2 border-b">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={prd.avatar_url} alt={prd.user_name} />
                  <AvatarFallback className="text-[8px]">
                    {prd.user_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-[10px] font-medium">
                  {normalizeDisplayName(prd.user_name)}
                </p>
                <UserRoleBadge userId={prd.user_id} size="sm" />
              </div>
            )}
            
            {/* Stats */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <RefreshCw className="w-2.5 h-2.5" />
                {prd.remixes_count}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" />
                {prd.view_count || 0}
              </span>
              <span className="ml-auto">
                {formatDistanceToNow(new Date(prd.created_at), { 
                  locale: ptBR,
                  addSuffix: true 
                })}
              </span>
            </div>
            
            {/* Ações */}
            <div className="flex items-center gap-1 pt-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onLike}
                className={`h-7 text-xs ${isLiked ? 'text-red-500' : ''}`}
              >
                <Heart className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Curtido' : 'Curtir'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onRemix}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Remix
              </Button>
              <div className="ml-auto">
                <ShareButtons prd={prd} />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </Card>
  );
};
