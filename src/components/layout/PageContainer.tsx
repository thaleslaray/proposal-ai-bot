import { cn } from '@/lib/utils';
import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * PageContainer - Wrapper principal para todas as páginas
 * Aplica padding, spacing e layout grid consistentes
 */
export const PageContainer = ({
  children,
  className,
  maxWidth = 'xl'
}: PageContainerProps) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      'w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6',
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
};
