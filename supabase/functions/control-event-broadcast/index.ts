import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ControlRequest {
  action: 'start_presentation' | 'open_voting' | 'close_voting' | 'reveal_results' | 'end_presentation';
  event_slug: string;
  team_name?: string;
  voting_duration_seconds?: number;
  pitch_duration_seconds?: number;
  random_mode?: boolean;
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

    const body: ControlRequest = await req.json();
    const { action, event_slug, team_name, voting_duration_seconds = 120, pitch_duration_seconds = 300, random_mode = false } = body;

    console.log(`Admin ${user.id} executing action: ${action} for event: ${event_slug}`);

    let newState: string;
    let votingClosesAt: string | null = null;
    let pitchClosesAt: string | null = null;
    let selectedTeamName = team_name;

    // FASE 3: Modo aleatório inteligente
    if (random_mode && (action === 'open_voting' || action === 'start_presentation')) {
      // Buscar times que ainda não apresentaram
      const { data: broadcastState } = await supabase
        .from('event_broadcast_state')
        .select('teams_presented')
        .eq('event_slug', event_slug)
        .single();

      // Buscar times que já votaram
      const { data: votedTeams } = await supabase
        .from('event_team_votes')
        .select('team_name')
        .eq('event_slug', event_slug);

      const presentedTeams = broadcastState?.teams_presented || [];
      const teamsWithVotes = new Set(votedTeams?.map(v => v.team_name) || []);

      // Buscar todos os participantes para gerar lista de times
      const { data: participants } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_slug', event_slug);

      const teamCount = Math.max(Math.ceil((participants?.length || 0) / 3), 6);
      const allTeams = Array.from({ length: teamCount }, (_, i) => `Time ${i + 1}`);

      // Filtrar times disponíveis (não apresentaram ainda)
      const availableTeams = allTeams.filter(t => !presentedTeams.includes(t));

      if (availableTeams.length === 0) {
        throw new Error('Não há times disponíveis para apresentação');
      }

      // Selecionar aleatoriamente
      selectedTeamName = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      console.log(`🎲 Time aleatório selecionado: ${selectedTeamName}`);
    }

    switch (action) {
      case 'start_presentation':
        if (!selectedTeamName) {
          throw new Error('team_name required for start_presentation');
        }
        newState = 'presenting_team';
        pitchClosesAt = new Date(Date.now() + pitch_duration_seconds * 1000).toISOString();
        console.log(`Starting presentation for team: ${selectedTeamName}, closes at: ${pitchClosesAt}`);
        break;

      case 'open_voting':
        if (!selectedTeamName) {
          throw new Error('team_name required for open_voting');
        }
        
        // Check if another voting is already open
        const { data: currentState } = await supabase
          .from('event_broadcast_state')
          .select('current_state, teams_presented')
          .eq('event_slug', event_slug)
          .single();

        if (currentState?.current_state === 'voting_open') {
          throw new Error('Another voting session is already open');
        }

        newState = 'voting_open';
        votingClosesAt = new Date(Date.now() + voting_duration_seconds * 1000).toISOString();
        
        // Adicionar time à lista de apresentados
        const teamsPresented = currentState?.teams_presented || [];
        if (!teamsPresented.includes(selectedTeamName)) {
          teamsPresented.push(selectedTeamName);
        }

        console.log(`Opening voting for team: ${selectedTeamName}, closes at: ${votingClosesAt}`);
        break;

      case 'close_voting':
        newState = 'idle';
        console.log('Closing voting session');
        break;

      case 'end_presentation':
        newState = 'idle';
        console.log(`Ending presentation for team: ${selectedTeamName}`);
        break;

      case 'reveal_results':
        newState = 'results_revealed';
        console.log('Revealing final results');
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Update or insert broadcast state
    const updateData: any = {
      event_slug,
      current_state: newState,
      current_team_name: action === 'end_presentation' ? null : (selectedTeamName || null),
      voting_closes_at: votingClosesAt,
      pitch_closes_at: action === 'end_presentation' ? null : pitchClosesAt,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    // Adicionar teams_presented apenas se for votação
    if (action === 'open_voting') {
      const { data: currentState } = await supabase
        .from('event_broadcast_state')
        .select('teams_presented')
        .eq('event_slug', event_slug)
        .single();

      const teamsPresented = currentState?.teams_presented || [];
      if (!teamsPresented.includes(selectedTeamName!)) {
        teamsPresented.push(selectedTeamName!);
      }
      updateData.teams_presented = teamsPresented;
    }

    const { data, error } = await supabase
      .from('event_broadcast_state')
      .upsert(updateData, {
        onConflict: 'event_slug'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating broadcast state:', error);
      throw error;
    }

    // FASE 10: Log da ação
    await supabase
      .from('event_control_log')
      .insert({
        event_slug,
        action,
        team_name: selectedTeamName,
        triggered_by: user.id,
        metadata: {
          random_mode,
          voting_duration_seconds,
          pitch_duration_seconds,
        },
      });

    console.log('Broadcast state updated successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        state: data,
        message: `Action ${action} executed successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in control-event-broadcast:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message.includes('Admin') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
