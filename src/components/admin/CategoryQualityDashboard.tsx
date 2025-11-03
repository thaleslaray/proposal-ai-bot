import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CategoryQualityMetrics {
  lowConfidencePercentage: number;
  fallbackUsagePercentage: number;
  categoryDistribution: { category: string; count: number; color: string }[];
  topPRDsByCategory: { category: string; title: string; likes: number }[];
  avgConfidence: number;
  totalPRDs: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  delivery: '#FF6B35',
  marketplace: '#4ECDC4',
  education: '#95E1D3',
  health: '#F38181',
  finance: '#AA96DA',
  crm_business: '#FCBAD3',
  content: '#FFFFD2',
  productivity: '#A8D8EA',
  real_estate: '#FFAAA5',
  utilities: '#B4E7CE',
  ai_automation: '#C7CEEA',
  other: '#D3D3D3',
};

export const CategoryQualityDashboard = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['category-quality-metrics'],
    queryFn: async (): Promise<CategoryQualityMetrics> => {
      // Buscar todos os PRDs com metadata de categoria
      const { data: prds, error } = await supabase
        .from('document_history')
        .select('id, category, category_metadata, likes_count, idea_preview')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalPRDs = prds?.length || 0;

      // Calcular % de baixa confiança (< 0.7)
      const lowConfidencePRDs =
        prds?.filter(prd => {
          const confidence = (prd.category_metadata as { confidence?: number })?.confidence;
          return confidence && confidence < 0.7;
        }).length || 0;

      const lowConfidencePercentage =
        totalPRDs > 0 ? Math.round((lowConfidencePRDs / totalPRDs) * 100) : 0;

      // Calcular % de uso de fallback (regex)
      const fallbackPRDs =
        prds?.filter(prd => {
          const metadata = prd.category_metadata as { confidence?: number; categories?: string[]; reasoning?: string };
          return (
            !metadata?.confidence ||
            metadata?.reasoning?.includes('fallback') ||
            metadata?.reasoning?.includes('regex')
          );
        }).length || 0;

      const fallbackUsagePercentage =
        totalPRDs > 0 ? Math.round((fallbackPRDs / totalPRDs) * 100) : 0;

      // Calcular confiança média
      const confidenceValues =
        prds
          ?.map(
            prd =>
              (prd.category_metadata as { confidence?: number; categories?: string[] })
                ?.confidence || 0
          )
          .filter(c => c > 0) || [];
      const avgConfidence =
        confidenceValues.length > 0
          ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
          : 0;

      // Distribuição de categorias
      const categoryCounts: Record<string, number> = {};
      prds?.forEach(prd => {
        const cat = prd.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const categoryDistribution = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category,
          count,
          color: CATEGORY_COLORS[category] || '#D3D3D3',
        }))
        .sort((a, b) => b.count - a.count);

      // Top PRDs por categoria (mais curtidos)
      const topPRDsByCategory: { category: string; title: string; likes: number }[] = [];
      const categoriesWithPRDs = [...new Set(prds?.map(p => p.category || 'other'))];

      for (const cat of categoriesWithPRDs) {
        const topPRD = prds
          ?.filter(p => (p.category || 'other') === cat)
          .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0];

        if (topPRD) {
          topPRDsByCategory.push({
            category: cat,
            title: topPRD.idea_preview.substring(0, 50) + '...',
            likes: topPRD.likes_count || 0,
          });
        }
      }

      return {
        lowConfidencePercentage,
        fallbackUsagePercentage,
        categoryDistribution,
        topPRDsByCategory: topPRDsByCategory.sort((a, b) => b.likes - a.likes).slice(0, 5),
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        totalPRDs,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 bg-[#2a2a2a]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 bg-[#1a1a1a]" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  // Alertas baseados em métricas
  const showLowConfidenceAlert = metrics.lowConfidencePercentage > 20;
  const showFallbackAlert = metrics.fallbackUsagePercentage > 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#0a0a0a]">📊 Qualidade da Categorização</h2>
        <div className="text-sm text-[#666666] font-bold">{metrics.totalPRDs} PRDs analisados</div>
      </div>

      {/* Alertas */}
      {(showLowConfidenceAlert || showFallbackAlert) && (
        <div className="space-y-2">
          {showLowConfidenceAlert && (
            <Alert className="border-4 border-[#FF6B35] bg-[#FFF5F2]">
              <AlertCircle className="h-5 w-5 text-[#FF6B35]" />
              <AlertDescription className="text-[#0a0a0a] font-bold">
                ⚠️ {metrics.lowConfidencePercentage}% dos PRDs têm confiança baixa (&lt;0.7).
                Considere revisar ou re-categorizar.
              </AlertDescription>
            </Alert>
          )}
          {showFallbackAlert && (
            <Alert className="border-4 border-[#FF6B35] bg-[#FFF5F2]">
              <AlertCircle className="h-5 w-5 text-[#FF6B35]" />
              <AlertDescription className="text-[#0a0a0a] font-bold">
                ⚠️ {metrics.fallbackUsagePercentage}% dos PRDs usaram fallback regex. OpenAI pode
                estar com problemas.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-4 border-black shadow-brutal">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666] uppercase tracking-wide font-bold mb-1">
                  Confiança Média
                </p>
                <p className="text-3xl font-black text-[#0a0a0a]">
                  {(metrics.avgConfidence * 100).toFixed(0)}%
                </p>
              </div>
              {metrics.avgConfidence >= 0.75 ? (
                <CheckCircle2 className="w-10 h-10 text-[#4ECDC4]" />
              ) : (
                <AlertCircle className="w-10 h-10 text-[#FF6B35]" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-4 border-black shadow-brutal">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666] uppercase tracking-wide font-bold mb-1">
                  Baixa Confiança
                </p>
                <p className="text-3xl font-black text-[#0a0a0a]">
                  {metrics.lowConfidencePercentage}%
                </p>
              </div>
              {metrics.lowConfidencePercentage <= 10 ? (
                <TrendingDown className="w-10 h-10 text-[#4ECDC4]" />
              ) : (
                <TrendingUp className="w-10 h-10 text-[#FF6B35]" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-4 border-black shadow-brutal">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666] uppercase tracking-wide font-bold mb-1">
                  Uso de Fallback
                </p>
                <p className="text-3xl font-black text-[#0a0a0a]">
                  {metrics.fallbackUsagePercentage}%
                </p>
              </div>
              {metrics.fallbackUsagePercentage <= 5 ? (
                <CheckCircle2 className="w-10 h-10 text-[#4ECDC4]" />
              ) : (
                <AlertCircle className="w-10 h-10 text-[#FF6B35]" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-4 border-black shadow-brutal">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666] uppercase tracking-wide font-bold mb-1">
                  Categorias Ativas
                </p>
                <p className="text-3xl font-black text-[#0a0a0a]">
                  {metrics.categoryDistribution.length}
                </p>
              </div>
              <div className="text-4xl">🏷️</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribuição de Categorias */}
        <Card className="bg-white border-4 border-black shadow-brutal">
          <CardHeader>
            <CardTitle className="font-black text-[#0a0a0a]">Distribuição de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.categoryDistribution}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={entry => `${entry.category}: ${entry.count}`}
                >
                  {metrics.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top PRDs por Categoria */}
        <Card className="bg-white border-4 border-black shadow-brutal">
          <CardHeader>
            <CardTitle className="font-black text-[#0a0a0a]">Top 5 PRDs Mais Curtidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.topPRDsByCategory}>
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="likes" fill="#FF6B35" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
