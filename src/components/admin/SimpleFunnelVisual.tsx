import { ArrowDown, FileText, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConversionFunnelData {
  totalRegistrations: number;
  firstPRD: number;
  engagedUsers: number;
  firstPRDRate: number;
  engagedRate: number;
}

interface SimpleFunnelVisualProps {
  data: ConversionFunnelData;
}

interface FunnelStage {
  icon: React.ReactNode;
  label: string;
  value: number;
  percentage: number;
  color: string;
  width: number;
}

export function SimpleFunnelVisual({ data }: SimpleFunnelVisualProps) {
  const stages: FunnelStage[] = [
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Registros',
      value: data.totalRegistrations,
      percentage: 100,
      color: 'bg-emerald-500',
      width: 100
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Primeiro PRD',
      value: data.firstPRD,
      percentage: data.firstPRDRate,
      color: 'bg-yellow-500',
      width: 75
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Usuários Engajados',
      value: data.engagedUsers,
      percentage: data.totalRegistrations > 0 ? (data.engagedUsers / data.totalRegistrations) * 100 : 0,
      color: 'bg-orange-500',
      width: 50
    }
  ];

  const calculateConversionRate = (fromIndex: number, toIndex: number): number => {
    const fromValue = stages[fromIndex].value;
    const toValue = stages[toIndex].value;
    return fromValue > 0 ? ((toValue / fromValue) * 100) : 0;
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto py-4">
      <div className="flex flex-col items-center gap-1.5">
        {stages.map((stage, index) => (
          <div key={index} className="w-full flex flex-col items-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            {/* Bloco do funil */}
            <div 
              className={`relative ${stage.color} rounded-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}
              style={{ width: `${stage.width}%` }}
            >
              <div className="px-4 py-4 text-center text-white">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {stage.icon}
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {stage.label}
                  </span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {stage.value.toLocaleString()}
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                  {stage.percentage.toFixed(1)}% do total
                </Badge>
              </div>
            </div>

            {/* Seta com taxa de conversão */}
            {index < stages.length - 1 && (
              <div className="flex flex-col items-center my-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground animate-pulse" />
                <Badge variant="outline" className="mt-0.5 text-xs font-semibold">
                  {calculateConversionRate(index, index + 1).toFixed(1)}% converteram
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Insights adicionais */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-center">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Ativação</p>
          <p className="text-xl font-bold">{data.firstPRDRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">criaram 1º PRD</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Engajamento</p>
          <p className="text-xl font-bold">{data.engagedRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">ficaram engajados</p>
        </div>
      </div>
    </div>
  );
}
