import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardData {
  stats: {
    totalUsers: number;
    docsToday: number;
    docsThisWeek: number;
    docsTotal: number;
    lastUpdated: string;
  };
  recentUsers: any[];
  recentDocs: any[];
  analytics: {
    timeline: any[];
    roles: any[];
    topUsers: any[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
    }

    console.log('Admin verified, fetching all dashboard data...');

    // PARALLEL FETCH: Get all data at once
    const [statsResult, usersResult, docsResult, analyticsData] = await Promise.all([
      // 1. Stats from cache (super fast!)
      supabase
        .from('admin_stats_cache')
        .select('*')
        .eq('id', 1)
        .single(),

      // 2. Recent users (limit 10)
      supabase.functions.invoke('get-admin-users', {
        body: { limit: 10, offset: 0 }
      }),

      // 3. Recent docs (limit 10)
      supabase.functions.invoke('get-document-history', {
        body: { limit: 10, offset: 0 }
      }),

      // 4. Analytics data
      (async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Timeline (limit 30 docs, grouped by day)
        const { data: docs } = await supabase
          .from('document_history')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(100); // Limit total docs fetched

        const grouped = docs?.reduce((acc: any, doc) => {
          const day = new Date(doc.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          });
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {});

        const timeline = Object.entries(grouped || {}).map(([day, count]) => ({
          day,
          documentos: count,
        }));

        // Role distribution
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role');

        const roleCounts = roles?.reduce((acc: any, { role }) => {
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {});

        const roleDistribution = Object.entries(roleCounts || {}).map(
          ([role, count]) => ({ name: role, value: count })
        );

        // Top 5 users (optimized with single query)
        const { data: topUsersData } = await supabase
          .from('document_history')
          .select('user_id, profiles!inner(name)')
          .limit(100);

        const userCounts = topUsersData?.reduce((acc: any, doc: any) => {
          const userId = doc.user_id;
          const name = doc.profiles?.name || 'Sem nome';
          if (!acc[userId]) {
            acc[userId] = { name, count: 0 };
          }
          acc[userId].count++;
          return acc;
        }, {});

        const topUsers = Object.values(userCounts || {})
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 5)
          .map((u: any) => ({ name: u.name, documentos: u.count }));

        return {
          timeline,
          roles: roleDistribution,
          topUsers,
        };
      })(),
    ]);

    const response: DashboardData = {
      stats: {
        totalUsers: statsResult.data?.total_users || 0,
        docsToday: statsResult.data?.docs_today || 0,
        docsThisWeek: statsResult.data?.docs_week || 0,
        docsTotal: statsResult.data?.docs_total || 0,
        lastUpdated: statsResult.data?.last_updated || new Date().toISOString(),
      },
      recentUsers: usersResult.data?.users || [],
      recentDocs: docsResult.data?.documents || [],
      analytics: analyticsData,
    };

    console.log('Dashboard data fetched successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});