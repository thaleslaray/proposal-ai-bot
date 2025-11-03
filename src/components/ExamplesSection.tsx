import { Lightbulb } from "lucide-react";

export const ExamplesSection = () => {
  const examples = [
    "App de delivery de comida caseira no meu bairro",
    "Sistema para agendar horários em salões de beleza",
    "Plataforma de aulas particulares online",
    "App para conectar diaristas com clientes"
  ];

  return (
    <div className="w-full max-w-5xl mb-8">
      <div className="border-brutal bg-card p-6 shadow-brutal">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-accent" />
          <h3 className="text-xl font-bold uppercase tracking-wide">
            Exemplos de ideias
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examples.map((example, index) => (
            <div 
              key={index}
              className="bg-background/50 p-4 border-2 border-foreground/10 rounded-sm"
            >
              <p className="text-sm leading-relaxed">
                "{example}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
