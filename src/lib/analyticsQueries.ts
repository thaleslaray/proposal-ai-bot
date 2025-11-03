import { supabase } from '@/integrations/supabase/client';

/**
 * 📊 Buscar dados de timeline (documentos + custos)
 */
export const getTimelineData = async (daysAgo: number = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  const [docsData, costsData] = await Promise.all([
    supabase
      .from('document_history')
      .select('created_at')
      .gte('created_at', startDate.toISOString()),
    
    supabase
      .from('api_usage')
      .select('created_at, cost_usd')
      .gte('created_at', startDate.toISOString())
  ]);

  // Agrupar por data
  const dateMap = new Map<string, { docs: number; cost: number }>();
  
  docsData.data?.forEach((doc) => {
    const date = new Date(doc.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    const current = dateMap.get(date) || { docs: 0, cost: 0 };
    dateMap.set(date, { ...current, docs: current.docs + 1 });
  });

  costsData.data?.forEach((cost) => {
    const date = new Date(cost.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    const current = dateMap.get(date) || { docs: 0, cost: 0 };
    dateMap.set(date, { ...current, cost: current.cost + (cost.cost_usd || 0) });
  });

  return Array.from(dateMap.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-15);
};

/**
 * 👥 Distribuição de roles
 */
export const getRoleDistribution = async () => {
  const { data } = await supabase.from('user_roles').select('role');
  
  const roleCount = new Map<string, number>();
  data?.forEach((r) => {
    roleCount.set(r.role, (roleCount.get(r.role) || 0) + 1);
  });
  
  return Array.from(roleCount.entries()).map(([name, value]) => ({ name, value }));
};

/**
 * 💰 Top 5 endpoints por custo
 */
export const getTopEndpointsByCost = async () => {
  const { data } = await supabase
    .from('api_usage')
    .select('endpoint, cost_usd')
    .order('cost_usd', { ascending: false })
    .limit(100);

  const endpointMap = new Map<string, number>();
  data?.forEach((e) => {
    endpointMap.set(e.endpoint, (endpointMap.get(e.endpoint) || 0) + (e.cost_usd || 0));
  });

  return Array.from(endpointMap.entries())
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
};

/**
 * 📈 Dados de aquisição (usa RPC existente)
 */
export const getAcquisitionMetrics = async (daysAgo: number) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  const { data, error } = await supabase.rpc('get_acquisition_metrics', {
    start_date: startDate.toISOString()
  });

  if (error) throw error;
  return typeof data === 'string' ? JSON.parse(data) : data;
};
