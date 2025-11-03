import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 'success' | 'error' | 'pending' | 'warning';

/**
 * Status Utilities - Helpers para ícones e cores de status
 * Fornece consistência visual para estados em toda a aplicação
 */
export const statusUtils = {
  /**
   * Retorna o ícone apropriado para um status
   * @param status - Tipo de status
   * @param className - Classes CSS adicionais
   */
  getStatusIcon: (status: StatusType, className?: string) => {
    const icons = {
      success: <Check className={cn('h-4 w-4 text-success', className)} />,
      error: <X className={cn('h-4 w-4 text-destructive', className)} />,
      pending: <Clock className={cn('h-4 w-4 text-warning', className)} />,
      warning: <AlertCircle className={cn('h-4 w-4 text-warning', className)} />
    };
    return icons[status];
  },
  
  /**
   * Retorna as classes de cor apropriadas para um status
   * @param status - Tipo de status
   */
  getStatusColor: (status: StatusType) => {
    const colors = {
      success: 'bg-success/10 text-success border-success',
      error: 'bg-destructive/10 text-destructive border-destructive',
      pending: 'bg-warning/10 text-warning border-warning',
      warning: 'bg-warning/10 text-warning border-warning'
    };
    return colors[status];
  },

  /**
   * Retorna uma badge com ícone e cor apropriados
   * @param status - Tipo de status
   * @param label - Texto da badge
   * @param className - Classes CSS adicionais
   */
  getStatusBadge: (status: StatusType, label: string, className?: string) => {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide border-2',
        statusUtils.getStatusColor(status),
        className
      )}>
        {statusUtils.getStatusIcon(status, 'h-3 w-3')}
        {label}
      </span>
    );
  },

  /**
   * Retorna a cor de texto apropriada para um status
   * @param status - Tipo de status
   */
  getStatusTextColor: (status: StatusType) => {
    const colors = {
      success: 'text-success',
      error: 'text-destructive',
      pending: 'text-warning',
      warning: 'text-warning'
    };
    return colors[status];
  },

  /**
   * Retorna a cor de fundo apropriada para um status
   * @param status - Tipo de status
   */
  getStatusBgColor: (status: StatusType) => {
    const colors = {
      success: 'bg-success/10',
      error: 'bg-destructive/10',
      pending: 'bg-warning/10',
      warning: 'bg-warning/10'
    };
    return colors[status];
  }
};
