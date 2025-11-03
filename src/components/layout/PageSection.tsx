import { cn } from '@/lib/utils';
import React from 'react';

interface PageSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

/**
 * PageSection - Componente para organizar seções dentro de uma página
 * Fornece estrutura consistente com título opcional e ações
 */
export const PageSection = ({
  title,
  children,
  className,
  headerAction
}: PageSectionProps) => {
  return (
    <section className={cn('space-y-4', className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-black uppercase">
            {title}
          </h2>
          {headerAction}
        </div>
      )}
      {children}
    </section>
  );
};
