import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'inline' | 'fullscreen';
  className?: string;
}

/**
 * ErrorState - Componente para exibir erros de forma consistente
 * Suporte para retry action e diferentes variantes
 */
export const ErrorState = ({
  title = 'Ops! Algo deu errado',
  message,
  onRetry,
  variant = 'inline',
  className
}: ErrorStateProps) => {
  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center text-center space-y-4',
      className
    )}>
      <div className="p-4 bg-destructive/10 border-4 border-destructive">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      
      <div>
        <h3 className="text-xl font-display font-black uppercase mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md font-normal">
          {message}
        </p>
      </div>
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-4 border-border shadow-brutal hover:shadow-brutal-hover transition-brutal"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      )}
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        {content}
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      {content}
    </div>
  );
};
