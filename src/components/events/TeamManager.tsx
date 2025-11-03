import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Plus, Trash2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TeamManagerProps {
  eventSlug: string;
}

export function TeamManager({ eventSlug }: TeamManagerProps) {
  const [teams, setTeams] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTeamNames = async () => {
      const { data: event } = await supabase
        .from('events')
        .select('team_names')
        .eq('slug', eventSlug)
        .single();

      if (event?.team_names) {
        setTeams(event.team_names as Record<string, string>);
      } else {
        // Generate default team names
        const defaultTeams: Record<string, string> = {};
        for (let i = 1; i <= 6; i++) {
          defaultTeams[`time_${i}`] = `Time ${i}`;
        }
        setTeams(defaultTeams);
      }
    };

    fetchTeamNames();
  }, [eventSlug]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ team_names: teams })
        .eq('slug', eventSlug);

      if (error) throw error;

      toast.success('✅ Nomes dos times salvos!');
    } catch (error: unknown) {
      logger.error('Error saving team names:', error);
      toast.error('Erro ao salvar nomes dos times');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTeam = () => {
    const newTeamNumber = Object.keys(teams).length + 1;
    setTeams({
      ...teams,
      [`time_${newTeamNumber}`]: `Time ${newTeamNumber}`,
    });
  };

  const handleRemoveTeam = (key: string) => {
    const newTeams = { ...teams };
    delete newTeams[key];
    setTeams(newTeams);
  };

  const handleTeamNameChange = (key: string, value: string) => {
    setTeams({
      ...teams,
      [key]: value,
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">👥 Gerenciar Times</h3>
        <Button onClick={handleAddTeam} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Time
        </Button>
      </div>

      <div className="space-y-3">
        {Object.entries(teams).map(([key, name]) => (
          <div key={key} className="flex items-center gap-2">
            <Input
              value={name}
              onChange={e => handleTeamNameChange(key, e.target.value)}
              placeholder="Nome do time"
            />
            <Button
              onClick={() => handleRemoveTeam(key)}
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full mt-6">
        {isSaving ? (
          'Salvando...'
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Salvar Nomes dos Times
          </>
        )}
      </Button>
    </Card>
  );
}
