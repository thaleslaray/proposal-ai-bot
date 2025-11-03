import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-foreground bg-card py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Shield className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wide">
                Política de Privacidade
              </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Última atualização: {new Date().toLocaleDateString('pt-BR')} | Versão 2.0
          </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl space-y-8">
        {/* Introdução */}
        <Card className="p-6 border-brutal shadow-brutal">
          <p className="text-sm leading-relaxed">
            A <strong>AUTOMATIZE NEGOCIOS DIGITAIS LTDA</strong> (nome fantasia "Escola de Automação"), 
            inscrita no CNPJ <strong>49.853.639/0001-09</strong>, com sede em Barueri/SP ("nós", "nosso" ou "Plataforma") está comprometida com a proteção
            da sua privacidade e o cumprimento da <strong>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)</strong>.
            Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais
            ao utilizar nossa plataforma de geração de documentos (PRDs) com Inteligência Artificial.
          </p>
        </Card>

        {/* Dados Coletados */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              1. Dados que Coletamos
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">1.1 Dados de Cadastro</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Nome completo</li>
                <li>Endereço de email</li>
                <li>Número de telefone (WhatsApp)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">1.2 Dados de Uso</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>PRDs criados e histórico de documentos</li>
                <li>Ideias e prompts inseridos</li>
                <li>Preferências de compartilhamento (públicos/privados)</li>
                <li>Interações na plataforma (likes, remixes, visualizações)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">1.3 Dados Técnicos</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Endereço IP e dados de navegação</li>
                <li>Tipo de dispositivo e navegador</li>
                <li>Logs de acesso e erros (analytics anônimos)</li>
              </ul>
            </div>
          </Card>
        </section>

        {/* Finalidade */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Eye className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              2. Finalidade do Tratamento
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal">
            <p className="text-sm mb-4">Utilizamos seus dados pessoais para:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-4">
              <li><strong>Autenticação:</strong> Validar sua identidade via WhatsApp OTP</li>
              <li><strong>Controle de Acesso:</strong> Gerenciar limites de uso e validar planos (Hotmart)</li>
              <li><strong>Geração de Documentos:</strong> Processar suas ideias e criar PRDs personalizados</li>
              <li><strong>Comunicação:</strong> Enviar documentos por email e notificações relevantes</li>
              <li><strong>Melhorias:</strong> Analisar uso da plataforma para otimizar funcionalidades</li>
              <li><strong>Suporte:</strong> Responder dúvidas e resolver problemas técnicos</li>
              <li><strong>Segurança:</strong> Prevenir fraudes e garantir integridade da plataforma</li>
            </ul>
          </Card>
        </section>

        {/* Base Legal */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-black uppercase tracking-wide">3. Base Legal (Art. 7º LGPD)</h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal">
            <p className="text-sm mb-4">Tratamos seus dados pessoais com base nas seguintes hipóteses legais:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-4">
              <li>
                <strong>Consentimento (Art. 7º, I):</strong> Você aceita expressamente ao criar conta e usar a
                plataforma
              </li>
              <li>
                <strong>Execução de Contrato (Art. 7º, V):</strong> Necessário para prestação de serviços (geração de
                PRDs)
              </li>
              <li>
                <strong>Legítimo Interesse (Art. 7º, IX):</strong> Análise de uso para melhorias técnicas (dados
                anonimizados)
              </li>
              <li>
                <strong>Obrigação Legal (Art. 7º, II):</strong> Cumprimento de exigências fiscais, regulatórias e
                judiciais
              </li>
            </ul>
          </Card>
        </section>

        {/* Compartilhamento */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-6 w-6 text-secondary" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              4. Compartilhamento de Dados
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal space-y-4">
            <p className="text-sm">
              <strong>Não vendemos seus dados pessoais.</strong> Compartilhamos informações apenas quando necessário:
            </p>
            <div>
              <h3 className="font-bold text-lg mb-2">4.1 Parceiros Essenciais</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li><strong>Hotmart:</strong> Validação de compras e planos ativos</li>
                <li><strong>Meta (WhatsApp Business API):</strong> Envio de códigos OTP</li>
                <li><strong>OpenAI (GPT-5):</strong> Processamento de IA para geração de PRDs via Lovable AI Gateway</li>
                <li><strong>Supabase:</strong> Armazenamento seguro de dados</li>
              </ul>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg mt-4">
              <p className="text-xs text-muted-foreground">
                ⚠️ <strong>Transferência Internacional (Art. 33º LGPD):</strong> Dados processados pela OpenAI podem
                ser armazenados nos Estados Unidos, conforme cláusulas contratuais padrão e medidas de proteção
                aprovadas pela LGPD. Você concorda com esta transferência ao usar a plataforma.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">4.2 Obrigações Legais</h3>
              <p className="text-sm ml-4">
                Podemos divulgar dados se exigido por lei, ordem judicial ou autoridade competente.
              </p>
            </div>
          </Card>
        </section>

        {/* Armazenamento */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              5. Armazenamento e Segurança
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">5.1 Localização</h3>
              <p className="text-sm ml-4">
                Dados armazenados em servidores seguros do <strong>Supabase</strong> (infraestrutura AWS),
                com criptografia em repouso e em trânsito (TLS 1.3).
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">5.2 Medidas de Segurança</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Criptografia de dados sensíveis (emails, senhas)</li>
                <li>Autenticação segura via OTP (One-Time Password)</li>
                <li>Rate limiting para prevenir abusos</li>
                <li>Logs de auditoria para detecção de atividades suspeitas</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">5.3 Retenção e Exclusão de Dados</h3>
              <p className="text-sm ml-4 mb-3">
                Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar a exclusão de sua conta,
                seus dados pessoais são <strong>deletados imediatamente</strong> e permanentemente de nossos sistemas.
              </p>
              <div className="bg-muted/30 p-3 rounded-lg ml-4">
                <p className="text-xs text-muted-foreground">
                  ℹ️ <strong>Registros de Auditoria (Art. 37º LGPD):</strong> Para fins de conformidade
                  regulatória e prestação de contas, mantemos registros mínimos de exclusões de conta
                  contendo apenas ID do usuário e data/hora por até 5 anos. Esses registros não contêm
                  dados pessoais identificáveis e são acessíveis apenas para fins de auditoria e resposta
                  a autoridades competentes.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Direitos do Usuário */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              6. Seus Direitos (LGPD)
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal">
            <p className="text-sm mb-4">
              De acordo com a LGPD, você tem direito a:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-4">
              <li><strong>Confirmação:</strong> Saber se processamos seus dados</li>
              <li><strong>Acesso:</strong> Solicitar cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
              <li><strong>Exclusão:</strong> Solicitar remoção de dados não mais necessários</li>
              <li><strong>Portabilidade:</strong> Receber dados em formato estruturado (JSON)</li>
              <li><strong>Revogação de Consentimento:</strong> Retirar autorização a qualquer momento</li>
              <li><strong>Oposição:</strong> Contestar o tratamento de dados em determinadas situações</li>
            </ul>
            <p className="text-sm mt-4">
              Para exercer seus direitos, acesse{" "}
              <Link to="/configuracoes/privacidade" className="text-primary hover:underline font-bold">
                Configurações de Privacidade
              </Link>{" "}
              ou entre em contato conosco.
            </p>
          </Card>
        </section>

        {/* Cookies */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-secondary" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              7. Cookies e Analytics
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal">
            <p className="text-sm mb-3">
              Utilizamos <strong>apenas cookies essenciais</strong> para funcionamento da plataforma:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-4">
              <li>
                <strong>Cookies de Sessão (Supabase):</strong> Necessários para autenticação e manutenção de login
              </li>
            </ul>
            <div className="bg-muted/30 p-3 rounded-lg mt-4">
              <p className="text-xs text-muted-foreground">
                ✅ <strong>Sem rastreamento:</strong> NÃO utilizamos Google Analytics, Meta Pixel, cookies de
                publicidade ou qualquer ferramenta de rastreamento de terceiros. Sua navegação é totalmente privada.
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Você pode desabilitar cookies nas configurações do navegador, mas isso pode afetar o funcionamento da
              plataforma.
            </p>
          </Card>
        </section>

        {/* Menores de Idade */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              8. Menores de Idade
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal">
            <p className="text-sm">
              Nossa plataforma é destinada a <strong>maiores de 18 anos</strong>. Não coletamos intencionalmente
              dados de menores sem autorização dos responsáveis legais. Se identificarmos cadastro irregular,
              a conta será suspensa imediatamente.
            </p>
          </Card>
        </section>

        {/* Alterações */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              9. Alterações na Política
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal">
            <p className="text-sm">
              Podemos atualizar esta Política periodicamente. Mudanças significativas serão notificadas por email ou
              através da plataforma. A versão atualizada terá nova data de vigência e número de versão.
            </p>
          </Card>
        </section>

        {/* Contato */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-secondary" />
            <h2 className="text-2xl font-black uppercase tracking-wide">
              10. Contato e Encarregado de Dados (DPO)
            </h2>
          </div>
          <Card className="p-6 border-brutal shadow-brutal">
            <p className="text-sm mb-4">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta Política, entre em contato:
            </p>
            <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
              <p>
                <strong>Razão Social:</strong> AUTOMATIZE NEGOCIOS DIGITAIS LTDA
              </p>
              <p>
                <strong>Nome Fantasia:</strong> Escola de Automação
              </p>
              <p>
                <strong>CNPJ:</strong> 49.853.639/0001-09
              </p>
              <p>
                <strong>Endereço:</strong> AL Rio Negro, 500 - Andar 5, Sala 501 a 508 (Torre B)
                <br />
                Alphaville Centro Industrial - Barueri/SP - CEP 06454-000
              </p>
              <p>
                <strong>Telefone:</strong> (11) 1318-1022
              </p>
              <p>
                <strong>📧 Email Geral:</strong>{" "}
                <a href="mailto:opa@escoladeautomacao.com.br" className="text-primary hover:underline">
                  opa@escoladeautomacao.com.br
                </a>
              </p>
              <div className="pt-3 mt-3 border-t border-border/50">
                <p>
                  <strong>🛡️ DPO (Encarregado de Dados - Art. 41º LGPD):</strong>
                </p>
                <p className="ml-4 mt-1">Thales Laray</p>
                <p className="ml-4">
                  Email:{" "}
                  <a href="mailto:privacidade@escoladeautomacao.com.br" className="text-primary hover:underline">
                    privacidade@escoladeautomacao.com.br
                  </a>
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                ⏱️ <strong>Prazo de resposta:</strong> até 15 dias úteis
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                ⚖️ <strong>Foro:</strong> Fica eleito o Foro da Comarca de Barueri/SP para dirimir quaisquer
                controvérsias oriundas desta Política de Privacidade.
              </p>
            </div>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center pt-8 border-t-4 border-foreground">
          <p className="text-sm font-bold uppercase tracking-wider opacity-60">
            © 2025 ESCOLA DE AUTOMAÇÃO | CNPJ 49.853.639/0001-09 | Protegido pela LGPD
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              Voltar para o início
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
