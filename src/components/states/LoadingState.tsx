import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface LoadingStateProps {
  variant?: 'fullscreen' | 'inline' | 'overlay';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * LoadingState - Componente para estados de carregamento
 * - variant "fullscreen": tela inteira para carregamento inicial
 * - variant "inline": para áreas específicas
 * - variant "overlay": sobrepõe o conteúdo existente
 */
export const LoadingState = ({
  variant = 'inline',
  message = 'Carregando...',
  size = 'md'
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 className={cn(
        'animate-spin text-accent',
        sizeClasses[size]
      )} />
      {message && (
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
};
