import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeightsRequest {
  event_slug: string;
  template_name: string;
  weights: {
    viability: number;
    innovation: number;
    pitch: number;
    demo: number;
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

    // Authenticate user
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

    const body: WeightsRequest = await req.json();
    const { event_slug, template_name, weights } = body;

    console.log(`Admin ${user.id} configuring weights for event: ${event_slug}`);

    // Validate weights sum to 1.00
    const sum = weights.viability + weights.innovation + weights.pitch + weights.demo;
    if (Math.abs(sum - 1.0) > 0.001) { // Allow small floating point errors
      throw new Error(`Weights must sum to 1.00 (got ${sum.toFixed(2)})`);
    }

    // Validate each weight is between 0 and 1
    if (
      weights.viability < 0 || weights.viability > 1 ||
      weights.innovation < 0 || weights.innovation > 1 ||
      weights.pitch < 0 || weights.pitch > 1 ||
      weights.demo < 0 || weights.demo > 1
    ) {
      throw new Error('All weights must be between 0 and 1');
    }

    // Upsert weights configuration
    const { data, error } = await supabase
      .from('event_voting_weights')
      .upsert({
        event_slug,
        template_name,
        weight_viability: weights.viability,
        weight_innovation: weights.innovation,
        weight_pitch: weights.pitch,
        weight_demo: weights.demo,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'event_slug'
      })
      .select()
      .single();

    if (error) {
      console.error('Error configuring weights:', error);
      throw error;
    }

    console.log('Weights configured successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        weights: data,
        message: 'Voting weights configured successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in configure-voting-weights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message.includes('Admin') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
