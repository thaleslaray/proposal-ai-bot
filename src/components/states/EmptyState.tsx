import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

/**
 * EmptyState - Componente para quando não há dados a exibir
 * Suporte para ícone, título, descrição e call-to-action
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 p-6 bg-muted border-4 border-border inline-block">
          {icon}
        </div>
      )}
      
      <h3 className="text-xl font-display font-black uppercase mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6 font-normal">
          {description}
        </p>
      )}
      
      {action && (
        <Button
          onClick={action.onClick}
          className="border-4 border-border shadow-brutal hover:shadow-brutal-hover transition-brutal"
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
};
