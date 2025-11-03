import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Props do componente PRDResult
 */
interface PRDResultProps {
  /** Conteúdo do PRD gerado (markdown formatado) */
  content: string;
}

export const PRDResult = ({ content }: PRDResultProps) => {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { isStudent, isLifetime } = useAuth();
  const isAluno = isStudent || isLifetime;

  if (!content) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("✅ Documento copiado! Cole onde quiser.");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar. Tente selecionar o texto manualmente.");
    }
  };

  return (
    <div className="w-full max-w-5xl animate-fade-in">
      <div className="border-brutal bg-card p-5 sm:p-6 md:p-8 shadow-brutal relative">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 md:mb-8">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight text-accent uppercase">
            Seu Documento
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="font-black uppercase text-xs sm:text-sm shrink-0"
          >
            {copied ? <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />}
            {copied ? "COPIADO!" : "COPIAR"}
          </Button>
        </div>
        
        <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none mb-5 sm:mb-6 md:mb-8">
          <div 
            className="whitespace-pre-wrap font-normal leading-relaxed text-sm sm:text-base"
            style={{ fontWeight: 500 }}
          >
            {content}
          </div>
        </div>

        <div className="mb-5 sm:mb-6 md:mb-8 flex justify-center">
          <Button
            variant="default"
            size="lg"
            onClick={handleCopy}
            className="font-black uppercase text-base sm:text-lg w-full sm:w-auto"
          >
            {copied ? <Check className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> : <Copy className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
            {copied ? "COPIADO!" : "COPIAR DOCUMENTO"}
          </Button>
        </div>

        <div className="mb-5 sm:mb-6 md:mb-8">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full border-2 border-[#667eea] bg-[#667eea]/10 hover:bg-[#667eea]/20 rounded-lg p-3 sm:p-4 transition-all duration-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#667eea] shrink-0" />
                  <span className="font-black text-sm sm:text-base lg:text-lg uppercase tracking-tight text-left">
                    🚀 Como Transformar Este Documento em App Real com Lovable
                  </span>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-[#667eea] transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="bg-muted/50 rounded-b-lg p-4 sm:p-6 mt-2">
              <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm leading-relaxed">
                <div className="space-y-3">
                  <p className="font-bold text-base">📋 Passo a Passo:</p>
                  
                  <div className="space-y-2 pl-4">
                    <p><strong>1.</strong> Clique no botão "COPIAR DOCUMENTO" acima ☝️</p>
                    
                    <p><strong>2.</strong> Acesse <a href="https://lovable.dev/?via=thales" target="_blank" rel="noopener noreferrer" className="text-[#667eea] hover:underline font-bold">lovable.dev</a> e crie uma nova conta</p>
                    
                    <p><strong>3.</strong> Cole o PRD no chat do Lovable e adicione esta instrução:</p>
                    <div className="bg-background/50 border border-border rounded p-2 sm:p-3 my-2 font-mono text-[10px] sm:text-xs overflow-x-auto">
                      "Implemente este PRD completo, começando pela Fase 1 (MVP). Organize bem a estrutura de pastas e componentes."
                    </div>
                    
                    <p><strong>4.</strong> Acompanhe o Lovable criando seu app em tempo real! 🎨</p>
                    
                    <p><strong>5.</strong> Depois da Fase 1 pronta, peça: <em>"Agora implemente a Fase 2"</em></p>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <p className="font-bold text-base">⚡ Dicas Importantes:</p>
                  <ul className="list-disc pl-8 space-y-1">
                    <li>Não peça todas as fases de uma vez - vá incrementando</li>
                    <li>Teste cada funcionalidade antes de avançar</li>
                    <li>Peça ajustes específicos quando necessário</li>
                    <li>O Lovable gera o código automaticamente - você só precisa conversar!</li>
                  </ul>
                </div>

                {isAluno ? (
                  <div className="border-t border-border pt-4">
                    <p className="font-bold text-base mb-2">🎓 Precisa de Ajuda?</p>
                    <div className="flex flex-wrap gap-2">
                      <a 
                        href="https://docs.lovable.dev" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#667eea] hover:underline text-xs"
                      >
                        📚 Documentação
                      </a>
                      <span className="text-muted-foreground">•</span>
                      <a 
                        href="https://comunidade.escoladeautomacao.com.br/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#667eea] hover:underline text-xs"
                      >
                        🎯 Suporte EA
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border pt-4">
                    <p className="font-bold text-base mb-3">🎓 Quer Dominar o Lovable?</p>
                    <div className="bg-[#667eea]/10 border-2 border-[#667eea] rounded-lg p-5 space-y-3">
                      <p className="font-bold text-center">
                        🚀 Na Escola de Automação você aprende a criar apps profissionais com Lovable!
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li>✨ Imersão completa de Lovable</li>
                        <li>💬 Suporte dedicado da comunidade</li>
                        <li>🎯 Projetos reais e práticos</li>
                      </ul>
                      <a 
                        href="https://escoladeautomacao.com.br/" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button className="w-full bg-[#667eea] hover:bg-[#5568d3] text-white font-bold">
                          Conhecer a Escola de Automação →
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="pt-5 sm:pt-6 md:pt-8 border-t-2 border-foreground/20 text-center">
          <p className="text-xs font-bold tracking-wide opacity-40">
            Criado com ❤️ pela Escola de Automação | @thaleslaray
          </p>
        </div>
      </div>
    </div>
  );
};