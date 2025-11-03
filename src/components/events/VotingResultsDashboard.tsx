import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VotingResultsDashboardProps {
  eventSlug: string;
}

interface TeamScore {
  team_name: string;
  total_votes: number;
  avg_viability: number;
  avg_innovation: number;
  avg_pitch: number;
  avg_demo: number;
  avg_weighted_score: number;
}

export function VotingResultsDashboard({ eventSlug }: VotingResultsDashboardProps) {
  const [scores, setScores] = useState<TeamScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      setIsLoading(true);
      
      // Query the materialized view directly
      const { data } = await supabase
        .from('event_team_scores')
        .select('*')
        .eq('event_slug', eventSlug)
        .order('avg_weighted_score', { ascending: false });

      if (data) {
        setScores(data);
      }
      
      setIsLoading(false);
    };

    fetchScores();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`results-${eventSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_team_votes',
        },
        () => {
          fetchScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventSlug]);

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Calculando resultados...</p>
      </Card>
    );
  }

  if (scores.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum voto registrado ainda</p>
      </Card>
    );
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">🏆 RESULTADOS FINAIS</h2>
        </div>

        {/* Podium - Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {scores.slice(0, 3).map((team, index) => (
            <Card
              key={team.team_name}
              className={`p-6 text-center ${
                index === 0
                  ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/50'
                  : index === 1
                  ? 'bg-gradient-to-br from-gray-400/20 to-gray-400/5 border-gray-400/50'
                  : 'bg-gradient-to-br from-orange-600/20 to-orange-600/5 border-orange-600/50'
              }`}
            >
              <div className="text-4xl mb-2">{getMedalEmoji(index)}</div>
              <h3 className="text-xl font-bold mb-2">{team.team_name}</h3>
              <p className="text-3xl font-bold text-primary mb-1">
                {team.avg_weighted_score.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {team.total_votes} voto{team.total_votes !== 1 ? 's' : ''}
              </p>
            </Card>
          ))}
        </div>

        {/* Detailed Scores Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-center">⚖️ Viável</TableHead>
                <TableHead className="text-center">💡 Inova</TableHead>
                <TableHead className="text-center">🎤 Pitch</TableHead>
                <TableHead className="text-center">🖥️ Demo</TableHead>
                <TableHead className="text-center font-bold">Score Final</TableHead>
                <TableHead className="text-center">Votos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((team, index) => (
                <TableRow key={team.team_name}>
                  <TableCell className="font-bold">
                    {getMedalEmoji(index) || index + 1}
                  </TableCell>
                  <TableCell className="font-semibold">{team.team_name}</TableCell>
                  <TableCell className="text-center">{team.avg_viability.toFixed(1)}</TableCell>
                  <TableCell className="text-center">{team.avg_innovation.toFixed(1)}</TableCell>
                  <TableCell className="text-center">{team.avg_pitch.toFixed(1)}</TableCell>
                  <TableCell className="text-center">{team.avg_demo.toFixed(1)}</TableCell>
                  <TableCell className="text-center font-bold text-primary text-lg">
                    {team.avg_weighted_score.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {team.total_votes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
