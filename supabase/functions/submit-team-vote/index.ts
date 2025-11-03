import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoteRequest {
  event_slug: string;
  team_name: string;
  scores: {
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

    const body: VoteRequest = await req.json();
    const { event_slug, team_name, scores } = body;

    console.log(`User ${user.id} voting for team ${team_name} in event ${event_slug}`);

    // Validate scores (0-10)
    const { viability, innovation, pitch, demo } = scores;
    if (
      viability < 0 || viability > 10 ||
      innovation < 0 || innovation > 10 ||
      pitch < 0 || pitch > 10 ||
      demo < 0 || demo > 10
    ) {
      throw new Error('All scores must be between 0 and 10');
    }

    // FASE 7: Prevent voting for own team
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_slug', event_slug)
      .eq('user_id', user.id)
      .single();

    if (participant) {
      const { data: allParticipants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_slug', event_slug)
        .order('registered_at', { ascending: true });

      if (allParticipants) {
        const userIndex = allParticipants.findIndex(p => p.user_id === user.id);
        const userTeamNumber = Math.floor(userIndex / 3) + 1;
        const userTeamName = `Time ${userTeamNumber}`;

        if (userTeamName === team_name) {
          return new Response(
            JSON.stringify({ error: '⚠️ Você não pode votar no seu próprio time!' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check if voting is open
    const { data: broadcastState } = await supabase
      .from('event_broadcast_state')
      .select('current_state, current_team_name, voting_closes_at')
      .eq('event_slug', event_slug)
      .single();

    if (!broadcastState || broadcastState.current_state !== 'voting_open') {
      throw new Error('Voting is not currently open');
    }

    if (broadcastState.current_team_name !== team_name) {
      throw new Error('Voting is open for a different team');
    }

    // Check if voting has expired
    if (broadcastState.voting_closes_at && new Date(broadcastState.voting_closes_at) < new Date()) {
      throw new Error('Voting period has expired');
    }

    // Get voting weights for this event
    const { data: weights, error: weightsError } = await supabase
      .from('event_voting_weights')
      .select('*')
      .eq('event_slug', event_slug)
      .single();

    if (weightsError || !weights) {
      // Fallback to default hybrid template
      console.warn('No weights configured, using default hybrid');
      const { data: defaultWeights } = await supabase
        .from('event_voting_weights')
        .select('*')
        .eq('event_slug', 'default-hybrid')
        .single();
      
      if (!defaultWeights) {
        throw new Error('No voting weights configured');
      }
      
      // Create weights for this event
      await supabase
        .from('event_voting_weights')
        .insert({
          event_slug,
          template_name: 'hybrid',
          weight_viability: 0.35,
          weight_innovation: 0.20,
          weight_pitch: 0.30,
          weight_demo: 0.15,
        });
    }

    // Calculate weighted score
    const w = weights || { 
      weight_viability: 0.35, 
      weight_innovation: 0.20, 
      weight_pitch: 0.30, 
      weight_demo: 0.15 
    };
    
    const weightedScore = 
      (viability * Number(w.weight_viability)) +
      (innovation * Number(w.weight_innovation)) +
      (pitch * Number(w.weight_pitch)) +
      (demo * Number(w.weight_demo));

    console.log(`Calculated weighted score: ${weightedScore.toFixed(2)}`);

    // Insert vote (will fail if user already voted for this team due to UNIQUE constraint)
    const { data: vote, error: voteError } = await supabase
      .from('event_team_votes')
      .insert({
        event_slug,
        team_name,
        voter_user_id: user.id,
        score_viability: viability,
        score_innovation: innovation,
        score_pitch: pitch,
        score_demo: demo,
        weighted_score: Number(weightedScore.toFixed(2)),
      })
      .select()
      .single();

    if (voteError) {
      if (voteError.code === '23505') { // Unique constraint violation
        throw new Error('You have already voted for this team');
      }
      console.error('Error inserting vote:', voteError);
      throw voteError;
    }

    console.log('Vote recorded successfully:', vote);

    return new Response(
      JSON.stringify({ 
        success: true, 
        vote,
        message: 'Vote recorded successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in submit-team-vote:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message.includes('already voted') ? 409 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
