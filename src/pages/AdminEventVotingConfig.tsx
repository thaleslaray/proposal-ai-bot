import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, Target, Scale, Lightbulb, Monitor } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { logger } from '@/lib/logger';

const TEMPLATES = {
  hybrid: {
    name: '🎯 HÍBRIDO (RECOMENDADO)',
    description: 'Equilibra viabilidade com capacidade de pitch',
    weights: { viability: 0.35, innovation: 0.2, pitch: 0.3, demo: 0.15 },
  },
  viability_focused: {
    name: '⚖️ FOCO EM VIABILIDADE',
    description: 'Prioriza produtos executáveis e escaláveis',
    weights: { viability: 0.4, innovation: 0.25, pitch: 0.2, demo: 0.15 },
  },
  innovation_focused: {
    name: '🎨 FOCO EM INOVAÇÃO',
    description: 'Valoriza criatividade e originalidade',
    weights: { viability: 0.25, innovation: 0.4, pitch: 0.25, demo: 0.1 },
  },
  balanced: {
    name: '⚖️ EQUILIBRADO',
    description: 'Todos os critérios têm peso igual',
    weights: { viability: 0.25, innovation: 0.25, pitch: 0.25, demo: 0.25 },
  },
};

export default function AdminEventVotingConfig() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('hybrid');
  const [customWeights, setCustomWeights] = useState({
    viability: 0.35,
    innovation: 0.2,
    pitch: 0.3,
    demo: 0.15,
  });
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (!slug) return;

    const fetchCurrentWeights = async () => {
      const { data } = await supabase
        .from('event_voting_weights')
        .select('*')
        .eq('event_slug', slug)
        .single();

      if (data) {
        setCustomWeights({
          viability: Number(data.weight_viability),
          innovation: Number(data.weight_innovation),
          pitch: Number(data.weight_pitch),
          demo: Number(data.weight_demo),
        });
        setSelectedTemplate(data.template_name);
      }
    };

    fetchCurrentWeights();
  }, [slug]);

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    setIsCustomMode(false);
    setCustomWeights(TEMPLATES[templateKey as keyof typeof TEMPLATES].weights);
  };

  const handleCustomWeightChange = (criterion: keyof typeof customWeights, value: number) => {
    setIsCustomMode(true);
    setCustomWeights({ ...customWeights, [criterion]: value / 100 });
  };

  const getTotalWeight = () => {
    return Object.values(customWeights).reduce((sum, w) => sum + w, 0);
  };

  const isValidWeights = () => {
    const total = getTotalWeight();
    return Math.abs(total - 1.0) < 0.001;
  };

  const handleSave = async () => {
    if (!slug || !isValidWeights()) {
      toast.error('Os pesos devem somar 100%');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('configure-voting-weights', {
        body: {
          event_slug: slug,
          template_name: isCustomMode ? 'custom' : selectedTemplate,
          weights: customWeights,
        },
      });

      if (error) throw error;

      toast.success('✅ Configuração de pesos salva com sucesso!');
    } catch (error: any) {
      logger.error('Error saving weights:', error);
      toast.error(error?.message || 'Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <div className="container mx-auto p-6 max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">📊 Configuração de Pesos de Votação</h1>

        {/* Template Selection */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Escolha um Template Predefinido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <Card
                key={key}
                className={`p-4 cursor-pointer transition-all ${
                  selectedTemplate === key && !isCustomMode
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleTemplateSelect(key)}
              >
                <h3 className="font-bold mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>⚖️ Viabilidade</span>
                    <span className="font-semibold">
                      {Math.round(template.weights.viability * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>💡 Inovação</span>
                    <span className="font-semibold">
                      {Math.round(template.weights.innovation * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>🎤 Pitch</span>
                    <span className="font-semibold">
                      {Math.round(template.weights.pitch * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>🖥️ Demo</span>
                    <span className="font-semibold">
                      {Math.round(template.weights.demo * 100)}%
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Custom Configuration */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🎨 Configuração Personalizada</h2>

          <div className="space-y-6">
            {/* Viability */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-semibold flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  ⚖️ Viabilidade
                </label>
                <span className="text-2xl font-bold text-primary">
                  {Math.round(customWeights.viability * 100)}%
                </span>
              </div>
              <Slider
                value={[customWeights.viability * 100]}
                onValueChange={v => handleCustomWeightChange('viability', v[0])}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Innovation */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  💡 Inovação
                </label>
                <span className="text-2xl font-bold text-primary">
                  {Math.round(customWeights.innovation * 100)}%
                </span>
              </div>
              <Slider
                value={[customWeights.innovation * 100]}
                onValueChange={v => handleCustomWeightChange('innovation', v[0])}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Pitch */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  🎤 Pitch
                </label>
                <span className="text-2xl font-bold text-primary">
                  {Math.round(customWeights.pitch * 100)}%
                </span>
              </div>
              <Slider
                value={[customWeights.pitch * 100]}
                onValueChange={v => handleCustomWeightChange('pitch', v[0])}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Demo */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-semibold flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  🖥️ Demo
                </label>
                <span className="text-2xl font-bold text-primary">
                  {Math.round(customWeights.demo * 100)}%
                </span>
              </div>
              <Slider
                value={[customWeights.demo * 100]}
                onValueChange={v => handleCustomWeightChange('demo', v[0])}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">TOTAL:</span>
              <span
                className={`text-2xl font-bold ${
                  isValidWeights() ? 'text-green-500' : 'text-destructive'
                }`}
              >
                {Math.round(getTotalWeight() * 100)}%
              </span>
            </div>
            {!isValidWeights() && (
              <p className="text-sm text-destructive mt-2">
                ⚠️ Os pesos devem somar exatamente 100%
              </p>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={!isValidWeights() || isSaving}
            className="w-full mt-4"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              '💾 SALVAR CONFIGURAÇÃO'
            )}
          </Button>
        </Card>

        {/* Simulation Preview */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">📊 Preview de Simulação</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Exemplo: Time fictício com notas Viável=9, Inovação=6, Pitch=8, Demo=7
          </p>
          <div className="space-y-2">
            {Object.entries(TEMPLATES).map(([key, template]) => {
              const score =
                9 * template.weights.viability +
                6 * template.weights.innovation +
                8 * template.weights.pitch +
                7 * template.weights.demo;
              return (
                <div key={key} className="flex justify-between items-center p-2 rounded bg-muted">
                  <span className="text-sm">{template.name}</span>
                  <span className="font-bold">{score.toFixed(2)}</span>
                </div>
              );
            })}
            {isCustomMode && (
              <div className="flex justify-between items-center p-2 rounded bg-primary/10 border border-primary">
                <span className="text-sm font-semibold">🎨 SEU CUSTOM</span>
                <span className="font-bold">
                  {(
                    9 * customWeights.viability +
                    6 * customWeights.innovation +
                    8 * customWeights.pitch +
                    7 * customWeights.demo
                  ).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
