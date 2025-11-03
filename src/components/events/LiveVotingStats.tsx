import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Users, CheckCircle, TrendingUp } from 'lucide-react';

interface LiveVotingStatsProps {
  eventSlug: string;
  currentTeamName: string | null;
}

interface TeamVoteCount {
  team_name: string;
  vote_count: number;
}

export function LiveVotingStats({ eventSlug, currentTeamName }: LiveVotingStatsProps) {
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [voteCounts, setVoteCounts] = useState<TeamVoteCount[]>([]);
  const [currentTeamVotes, setCurrentTeamVotes] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      // Total participants
      const { count: participantCount } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_slug', eventSlug);

      setTotalParticipants(participantCount || 0);

      // Vote counts per team
      const { data: votes } = await supabase
        .from('event_team_votes')
        .select('team_name')
        .eq('event_slug', eventSlug);

      if (votes) {
        const counts = votes.reduce((acc, vote) => {
          acc[vote.team_name] = (acc[vote.team_name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const countsArray = Object.entries(counts).map(([team_name, vote_count]) => ({
          team_name,
          vote_count,
        }));

        setVoteCounts(countsArray);

        // Current team votes
        if (currentTeamName) {
          setCurrentTeamVotes(counts[currentTeamName] || 0);
        }
      }
    };

    fetchStats();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`stats-${eventSlug}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_team_votes',
          filter: `event_slug=eq.${eventSlug}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventSlug, currentTeamName]);

  const getStatusEmoji = (teamName: string) => {
    const count = voteCounts.find(v => v.team_name === teamName)?.vote_count || 0;
    const percentage = totalParticipants > 0 ? (count / totalParticipants) * 100 : 0;
    
    if (percentage >= 90) return '✅';
    if (percentage >= 50) return '🟡';
    return '🔴';
  };

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        ⚡ STATUS AO VIVO
      </h3>

      <div className="space-y-3">
        {/* Total participants */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Participantes</span>
          </div>
          <span className="text-xl font-bold">{totalParticipants}</span>
        </div>

        {/* Current team votes */}
        {currentTeamName && (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{currentTeamName}</span>
            </div>
            <span className="text-xl font-bold text-primary">
              {currentTeamVotes}/{totalParticipants}
            </span>
          </div>
        )}

        {/* All teams */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">📊 VOTOS POR TIME</p>
          <div className="space-y-2">
            {voteCounts.map((team) => (
              <div key={team.team_name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {getStatusEmoji(team.team_name)}
                  {team.team_name}
                </span>
                <span className="font-mono font-semibold">
                  {team.vote_count}/{totalParticipants}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
