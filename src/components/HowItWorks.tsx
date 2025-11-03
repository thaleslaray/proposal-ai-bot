import { MessageSquare, Sparkles, FileText } from "lucide-react";

export const HowItWorks = () => {
  const steps = [
    {
      icon: MessageSquare,
      title: "1. Conte sua ideia",
      description: "Digite ou grave sua ideia de negócio, app ou produto"
    },
    {
      icon: Sparkles,
      title: "2. Deixamos organizado",
      description: "Nossa IA transforma sua ideia em um documento profissional"
    },
    {
      icon: FileText,
      title: "3. Receba e use",
      description: "Use o documento completo no seu criador de apps preferido"
    }
  ];

  return (
    <div className="w-full max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
          <div 
            key={index}
            className="border-brutal bg-card p-5 sm:p-6 md:p-7 shadow-brutal text-center"
          >
            <div className="flex justify-center mb-4 sm:mb-5">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-accent/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 uppercase tracking-wide">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
