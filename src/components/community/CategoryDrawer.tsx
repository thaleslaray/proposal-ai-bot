import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Filter, Check } from 'lucide-react';

interface Category {
  id: string;
  icon: string;
  label: string;
}

interface CategoryDrawerProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Category[];
}

export const CategoryDrawer = ({
  selectedCategory,
  onCategoryChange,
  categories
}: CategoryDrawerProps) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          Filtrar por Categoria
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="ml-2">
              1
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filtrar por Categoria</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-2 p-4 max-h-[60vh] overflow-y-auto">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isSelected ? 'default' : 'outline'}
                className="h-14 justify-start gap-3 text-left"
                onClick={() => onCategoryChange(cat.id)}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="font-semibold flex-1">{cat.label}</span>
                {isSelected && <Check className="h-5 w-5" />}
              </Button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
