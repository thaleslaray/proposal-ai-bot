import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, CheckCircle2, Clock, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/logger';

interface Participant {
  user_id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  has_voted: boolean;
  voted_at: string | null;
  weighted_score: number | null;
  voting_for_team: string | null;
}

interface VotingParticipantsListProps {
  eventSlug: string;
  currentTeamName: string | null;
}

export function VotingParticipantsList({
  eventSlug,
  currentTeamName,
}: VotingParticipantsListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'voted' | 'pending'>('all');
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('event_participants_voting_status')
        .select('*')
        .eq('event_slug', eventSlug);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      logger.error('Erro ao carregar participantes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();

    // Realtime para votos
    const channel = supabase
      .channel(`voting-participants-${eventSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_team_votes',
          filter: `event_slug=eq.${eventSlug}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventSlug]);

  const filteredParticipants = participants.filter(p => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'voted' && p.has_voted) ||
      (filter === 'pending' && !p.has_voted);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: participants.length,
    voted: participants.filter(p => p.has_voted).length,
    pending: participants.filter(p => !p.has_voted).length,
    percentage:
      participants.length > 0
        ? Math.round((participants.filter(p => p.has_voted).length / participants.length) * 100)
        : 0,
  };

  if (loading) {
    return <Card className="p-6">Carregando participantes...</Card>;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Participantes</h3>
            {currentTeamName && (
              <p className="text-sm text-muted-foreground">
                Votando em: <span className="font-medium">{currentTeamName}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {stats.total}
            </Badge>
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats.voted}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {stats.pending}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Participação</span>
            <span className="font-semibold">{stats.percentage}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <Badge
              variant={filter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              Todos
            </Badge>
            <Badge
              variant={filter === 'voted' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('voted')}
            >
              Votaram
            </Badge>
            <Badge
              variant={filter === 'pending' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('pending')}
            >
              Pendentes
            </Badge>
          </div>
        </div>

        {/* Participants List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum participante encontrado
              </div>
            ) : (
              filteredParticipants.map(participant => (
                <div
                  key={participant.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.avatar_url || undefined} />
                    <AvatarFallback>
                      {(participant.name || participant.username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {participant.name || participant.username || 'Sem nome'}
                    </p>
                    {participant.email && (
                      <p className="text-sm text-muted-foreground truncate">{participant.email}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {participant.has_voted ? (
                      <>
                        {participant.weighted_score && (
                          <Badge variant="secondary" className="font-mono">
                            {participant.weighted_score.toFixed(1)}
                          </Badge>
                        )}
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Votou
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
