import { cn } from '@/lib/utils';
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - Componente que padroniza o cabeçalho de todas as páginas
 * - Título obrigatório
 * - Descrição opcional
 * - Área de ações (botões, filtros, etc) opcional e alinhada à direita
 */
export const PageHeader = ({
  title,
  description,
  actions,
  icon,
  className
}: PageHeaderProps) => {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
      'pb-6 border-b-4 border-border',
      className
    )}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-3 bg-accent/10 border-4 border-border">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground font-normal">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
