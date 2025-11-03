import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const PRDCardSkeleton = () => (
  <Card className="p-6 space-y-4">
    {/* Ícone da categoria */}
    <Skeleton className="h-16 w-16 mx-auto rounded-full" />
    
    {/* Título */}
    <Skeleton className="h-6 w-3/4 mx-auto" />
    
    {/* Preview da ideia */}
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
    
    {/* Tags */}
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
    </div>
    
    {/* Barra de complexidade */}
    <Skeleton className="h-2 w-full" />
    
    {/* Nome do criador */}
    <Skeleton className="h-4 w-32" />
    
    {/* Stats */}
    <div className="flex gap-4">
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-12" />
    </div>
    
    {/* Botões */}
    <Skeleton className="h-10 w-full" />
  </Card>
);
