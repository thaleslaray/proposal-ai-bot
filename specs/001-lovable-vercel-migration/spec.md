# Feature Specification: Migração Lovable → Vercel

**Feature Branch**: `001-lovable-vercel-migration`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "crie um plano de migracao da codebase atual que está usando lovable + supabase, pra irmos pra vercel + supabase"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy transparente para desenvolvedores (Priority: P1)

A equipe de desenvolvimento precisa realizar deploys da aplicação React + Supabase no Vercel sem interrupção do serviço atual no Lovable, permitindo validação completa antes de trocar o DNS para produção.

**Why this priority**: É o bloqueio crítico - sem deploy funcional no Vercel, nenhuma outra etapa pode ser validada. Entrega valor imediato (ambiente de staging funcional).

**Independent Test**: Pode ser testado acessando a URL temporária do Vercel (*.vercel.app) e verificando que todas as páginas carregam, autenticação funciona, e Edge Functions respondem corretamente. Não depende de nenhuma outra user story estar completa.

**Acceptance Scenarios**:

1. **Given** código na branch `main`, **When** push é feito para o repositório, **Then** Vercel realiza build e deploy automático em menos de 5 minutos
2. **Given** variáveis de ambiente configuradas no Vercel, **When** aplicação é acessada via URL de preview, **Then** todas as funcionalidades carregam sem erros 404/500
3. **Given** Edge Functions do Supabase configuradas, **When** usuário tenta fazer login via WhatsApp OTP, **Then** autenticação funciona idêntica ao Lovable
4. **Given** deploy bem-sucedido no Vercel, **When** desenvolvedores acessam painel do Vercel, **Then** conseguem visualizar logs, métricas e analytics em tempo real

---

### User Story 2 - Otimização de custos e performance (Priority: P2)

A equipe de produto precisa reduzir custos operacionais mensais mantendo ou melhorando a performance da aplicação, com visibilidade clara sobre gastos e métricas de uso.

**Why this priority**: Após US1 estar funcionando, otimizações podem ser implementadas incrementalmente para justificar a migração economicamente. Entrega ROI mensurável.

**Independent Test**: Pode ser testado comparando faturas do Lovable ($20/mês) vs Vercel ($20/mês base), medindo tempo de carregamento de páginas (LCP, TTI) antes e depois, e validando que custos de Edge Functions do Supabase reduziram devido a caching implementado. Funciona mesmo se US1 ainda estiver em staging.

**Acceptance Scenarios**:

1. **Given** migração completa para Vercel, **When** final do primeiro mês de uso, **Then** custo mensal total é igual ou menor que stack anterior (Lovable + Supabase)
2. **Given** otimizações de cache implementadas, **When** usuário acessa páginas repetidas vezes, **Then** tempo de carregamento reduz em pelo menos 30% após primeiro acesso
3. **Given** analytics do Vercel habilitado, **When** equipe de produto acessa dashboard, **Then** conseguem visualizar Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1) por página
4. **Given** implementação de Edge Config para cache, **When** Edge Functions são invocadas, **Then** número de chamadas ao Supabase reduz em pelo menos 40%

---

### User Story 3 - Rollback seguro e zero downtime (Priority: P3)

A equipe de DevOps precisa garantir que, em caso de problemas críticos após migração, é possível reverter para o Lovable em menos de 5 minutos sem perda de dados ou downtime para usuários.

**Why this priority**: É uma rede de segurança, mas só faz sentido após US1 e US2 estarem validadas. Entrega confiança para fazer a troca de DNS definitiva.

**Independent Test**: Pode ser testado simulando uma falha no Vercel (desligar manualmente o projeto), revertendo DNS de volta para Lovable, e validando que usuários conseguem acessar a aplicação normalmente em menos de 5 minutos. Não depende das otimizações de US2.

**Acceptance Scenarios**:

1. **Given** DNS configurado com TTL baixo (300s), **When** equipe identifica problema crítico no Vercel, **Then** conseguem reverter DNS para Lovable em menos de 5 minutos via painel de DNS
2. **Given** ambos ambientes (Lovable e Vercel) ativos simultaneamente, **When** rollback é executado, **Then** nenhum dado é perdido (Supabase é único source of truth)
3. **Given** procedimento de rollback documentado, **When** desenvolvedor sem contexto prévio executa passos, **Then** consegue reverter ambiente em tempo esperado (teste de runbook)
4. **Given** monitoramento ativo (Sentry, Vercel Analytics), **When** erro crítico ocorre no Vercel, **Then** alertas automáticos notificam equipe em menos de 2 minutos

---

### Edge Cases

- **Deploys simultâneos no Lovable e Vercel**: O que acontece se um desenvolvedor fizer push enquanto o Vercel está em processo de migração? (Resposta: Vercel ignora builds do Lovable, apenas deploys para branch configurado)
- **Variáveis de ambiente desincronizadas**: Como garantir que env vars no Vercel estejam sempre atualizadas com o Lovable? (Resposta: Processo de sincronização manual inicial + documentação de como adicionar novas vars)
- **Builds falhando no Vercel mas funcionando no Lovable**: Como debugar diferenças entre ambientes de build? (Resposta: Usar Vercel CLI local para replicar ambiente exato do build)
- **Limites de concorrência do Vercel**: O que acontece se aplicação receber spike de tráfego maior que limites do plano Pro? (Resposta: Vercel escala automaticamente, mas pode haver custos adicionais - monitoramento de uso)
- **Certificados SSL/TLS**: Como garantir HTTPS funcionando corretamente no Vercel antes de trocar DNS? (Resposta: Vercel provê SSL automático via Let's Encrypt, testar com URL de preview)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE permitir deploy automático de código do repositório GitHub para ambiente Vercel sem intervenção manual
- **FR-002**: Sistema DEVE preservar todas as funcionalidades existentes no Lovable após migração (autenticação WhatsApp OTP, geração de PRDs, eventos, admin dashboard, etc.)
- **FR-003**: Sistema DEVE configurar variáveis de ambiente no Vercel idênticas às do Lovable, incluindo chaves do Supabase, OpenAI, Hotmart e WhatsApp
- **FR-004**: Sistema DEVE manter conectividade com Supabase (database, Edge Functions, Auth, Storage, Realtime) sem alterações no backend
- **FR-005**: Sistema DEVE fornecer URLs de preview únicos para cada branch/PR permitindo testes isolados antes de merge
- **FR-006**: Sistema DEVE exibir logs de build, runtime e erros em tempo real no dashboard do Vercel
- **FR-007**: Sistema DEVE implementar mecanismo de cache (Vercel Edge Config ou Upstash Redis) para reduzir chamadas a Edge Functions do Supabase
- **FR-008**: Sistema DEVE permitir rollback para Lovable via mudança de DNS sem perda de dados ou downtime > 5 minutos
- **FR-009**: Sistema DEVE documentar processo completo de migração incluindo: setup inicial, configuração de env vars, build settings, e troubleshooting
- **FR-010**: Sistema DEVE configurar custom domain no Vercel e validar SSL/TLS antes de troca definitiva de DNS

### Assumptions

- **Assumption 1**: Repositório GitHub está atualizado e todo código do Lovable já está comitado (sem alterações locais não versionadas)
- **Assumption 2**: Credenciais do Supabase (Project URL, Anon Key, Service Role Key) não serão alteradas durante migração
- **Assumption 3**: Custos do Vercel Pro ($20/mês) + Supabase Pro ($25/mês) estão aprovados pelo orçamento
- **Assumption 4**: Time tem acesso administrativo ao domínio DNS para fazer alterações (adicionar registros CNAME/A)
- **Assumption 5**: Build do Vite no Lovable é compatível com build do Vite no Vercel (mesmas versões de Node.js e dependências)
- **Assumption 6**: Não há deploys manuais ou alterações diretas no painel do Lovable (tudo passa por Git)
- **Assumption 7**: Tempo de TTL do DNS pode ser reduzido temporariamente (de padrão 3600s para 300s) durante migração
- **Assumption 8**: Monitoramento com Sentry já está configurado ou pode ser configurado antes da migração

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Aplicação no Vercel carrega todas as páginas (/, /galeria, /u/:username, /admin/*, /evento/*) sem erros 404/500 em 100% dos testes manuais
- **SC-002**: Tempo de build no Vercel é igual ou menor que no Lovable (atualmente ~3-4 minutos, meta: <5 minutos)
- **SC-003**: Core Web Vitals mantêm ou melhoram: LCP <2.5s (95th percentile), FID <100ms, CLS <0.1
- **SC-004**: Custo mensal total após 30 dias de uso no Vercel é igual ou menor que custo anterior (baseline: Lovable $20 + Supabase edge functions)
- **SC-005**: Rollback de emergência (Vercel → Lovable) é executado com sucesso em menos de 5 minutos em testes simulados
- **SC-006**: Zero perda de dados ou sessões de usuários durante troca de DNS (validado por ausência de erros de autenticação e dados inconsistentes)
- **SC-007**: 100% dos desenvolvedores confirmam que DX (Developer Experience) no Vercel é igual ou superior ao Lovable após 1 semana de uso (logs, analytics, preview URLs)
- **SC-008**: Chamadas a Edge Functions do Supabase reduzem em pelo menos 25% após implementação de cache no Vercel (medido via dashboard do Supabase)

### Dependencies

- **Dependency 1**: Acesso administrativo ao projeto Vercel (criar novo projeto ou usar existente)
- **Dependency 2**: Acesso ao repositório GitHub com permissões de admin (para configurar webhooks e integração com Vercel)
- **Dependency 3**: Acesso ao painel de DNS do domínio (para adicionar registros CNAME e alterar TTL)
- **Dependency 4**: Credenciais do Supabase (Project ID, URL, Anon Key, Service Role Key) para configurar no Vercel
- **Dependency 5**: Credenciais de APIs externas (OpenAI, Hotmart, WhatsApp, Sentry) para replicar no Vercel
- **Dependency 6**: Conhecimento do setup atual do Lovable (quais env vars estão configuradas, build commands, output directory)

### Out of Scope

- **Migração do Supabase**: Backend permanece no Supabase, apenas frontend migra para Vercel
- **Reescrita de código**: Nenhuma refatoração ou alteração de features, apenas mudança de hosting
- **Migração de banco de dados**: Database continua no Supabase PostgreSQL, sem alterações
- **Mudança de arquitetura**: Edge Functions, RLS policies, triggers permanecem iguais
- **Otimizações de bundle size**: Code splitting agressivo fica para fase futura (fora desta spec)
- **Implementação de CDN customizado**: Vercel já provê CDN global, não há necessidade de Cloudflare adicional nesta fase
- **A/B testing entre Lovable e Vercel**: Migração é all-or-nothing via DNS, sem split de tráfego
- **Migração de domínio**: Domínio atual é mantido, apenas muda apontamento DNS
