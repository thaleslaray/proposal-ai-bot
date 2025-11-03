import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Clock, Heart, RefreshCw, Eye } from 'lucide-react';
import { CategoryDrawer } from './CategoryDrawer';

interface Category {
  id: string;
  icon: string;
  label: string;
}

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: 'recent' | 'likes' | 'remixes' | 'views';
  onSortChange: (value: 'recent' | 'likes' | 'remixes' | 'views') => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Category[];
}

export const SearchBar = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedCategory,
  onCategoryChange,
  categories
}: SearchBarProps) => {
  return (
    <div className="space-y-3">
      {/* Linha 1: Busca + Ordenação */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar PRDs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 text-base border-2 border-border font-medium pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-[200px] h-12 border-2 font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Mais Recentes
              </div>
            </SelectItem>
            <SelectItem value="likes">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Mais Curtidos
              </div>
            </SelectItem>
            <SelectItem value="remixes">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Mais Remixados
              </div>
            </SelectItem>
            <SelectItem value="views">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Mais Vistos
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Linha 2: Filtro de categoria (só mobile/tablet) */}
      <div className="lg:hidden">
        <CategoryDrawer 
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          categories={categories}
        />
      </div>
      
      {/* Contador de Filtros Ativos */}
      {searchTerm && (
        <div className="text-xs sm:text-sm text-muted-foreground font-bold">
          Buscando por "{searchTerm}"
        </div>
      )}
    </div>
  );
};
