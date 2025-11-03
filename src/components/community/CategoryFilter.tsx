import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { id: 'all', icon: '🌟', label: 'Todas' },
  { id: 'productivity', icon: '📋', label: 'Produtividade' },
  { id: 'finance', icon: '💰', label: 'Finanças' },
  { id: 'ai_automation', icon: '🤖', label: 'IA & Automação' },
  { id: 'crm_business', icon: '💼', label: 'CRM & Negócios' },
  { id: 'education', icon: '📚', label: 'Educação' },
  { id: 'delivery', icon: '🍕', label: 'Delivery' },
  { id: 'real_estate', icon: '🏠', label: 'Imobiliário' },
  { id: 'marketplace', icon: '🛍️', label: 'Marketplace' },
  { id: 'health', icon: '🏥', label: 'Saúde' },
  { id: 'content', icon: '🎨', label: 'Conteúdo' },
  { id: 'utilities', icon: '🔧', label: 'Utilidades' },
  { id: 'other', icon: '📦', label: 'Outros' },
];

interface CategoryFilterProps {
  selected: string;
  onChange: (category: string) => void;
}

export const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  return (
    <div className="relative">
      {/* Gradiente esquerdo (mobile only) */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none md:hidden" />
      
      {/* Container scrollável */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 md:flex-wrap md:justify-center md:overflow-visible touch-pan-x">
        {CATEGORIES.map(cat => (
          <Button
            key={cat.id}
            variant={selected === cat.id ? 'default' : 'outline'}
            className={`snap-center shrink-0 min-w-[120px] sm:min-w-[140px] md:min-w-0 px-4 py-2.5 md:px-6 md:py-3 border-2 border-border font-bold tracking-tight text-sm md:text-base transition-brutal touch-manipulation ${
              selected === cat.id 
                ? 'bg-accent text-accent-foreground scale-105' 
                : 'bg-card text-foreground hover:bg-accent/10'
            }`}
            onClick={() => onChange(cat.id)}
          >
            <span className="text-xl md:text-2xl mr-2">{cat.icon}</span>
            <span>{cat.label}</span>
          </Button>
        ))}
      </div>
      
      {/* Gradiente direito (mobile only) */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none md:hidden" />
    </div>
  );
};
