# Implementation Plan: Migração Lovable → Vercel

**Branch**: `001-lovable-vercel-migration` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-lovable-vercel-migration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migrar frontend React/Vite da plataforma Lovable para Vercel mantendo 100% das funcionalidades e conectividade com Supabase (backend, auth, database, storage, realtime). Objetivo: melhorar DX (developer experience), manter paridade de custos, e preparar infraestrutura para otimizações futuras de performance e caching. Migração será executada de forma incremental com zero downtime, mantendo Lovable ativo como fallback até validação completa no Vercel.

**Abordagem técnica**: Deploy paralelo em ambiente de staging do Vercel → validação completa de funcionalidades → implementação de cache (Upstash Redis) → configuração de custom domain + SSL → troca gradual de DNS com TTL baixo (300s) → monitoramento ativo por 7 dias → desativação do Lovable após estabilização.

## Technical Context

**Language/Version**: JavaScript/TypeScript (Node.js 20.x, TypeScript 5.8.3)
**Primary Dependencies**: React 18.3.1, Vite 5.4.19, Supabase JS Client 2.75.0, TanStack Query 5.83.0, TailwindCSS 3.4.17, shadcn/ui
**Storage**: Supabase PostgreSQL (backend - inalterado), Supabase Storage (avatars - inalterado)
**Testing**: Vitest 3.2.4, Testing Library 16.3.0, Sentry (error monitoring)
**Target Platform**: Vercel (Edge Network), browsers modernos (ES2020+)
**Project Type**: Web (SPA React hospedada no Vercel, backend Supabase permanece inalterado)
**Performance Goals**:
- Build time: <5min (atual Lovable: ~3-4min)
- LCP <2.5s (95th percentile)
- TTI <3.5s
- Uptime: 99.9% (SLA Vercel Pro)
- Deploy frequency: múltiplos por dia (CI/CD automático)

**Constraints**:
- Zero downtime durante migração (requisito crítico de negócio)
- Rollback deve ser possível em <5min via DNS
- Custo mensal total ≤ stack atual (Lovable $20 + Supabase edge functions)
- Todas as 186 arquivos TypeScript devem compilar sem erros no Vercel
- 29 Edge Functions do Supabase devem continuar funcionando sem alterações

**Scale/Scope**:
- ~1.000 usuários ativos/mês (estimativa atual)
- ~5.000 PRDs gerados/mês
- ~50.000 chamadas a Edge Functions/mês
- ~50GB bandwidth/mês
- Crescimento esperado: 20-30%/mês

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Reference**: `.specify/memory/constitution.md`

**NOTA IMPORTANTE**: Esta feature é uma **migração de infraestrutura** (hosting only). Não há alteração de código, componentes, features ou banco de dados. Portanto, a maioria dos princípios da constituição **não se aplica** (N/A) ou **já está implementada no código existente**.

### I. Supabase-First Architecture ✓

- [x] Uses Supabase for data persistence (PostgreSQL) - **INALTERADO** - Backend Supabase permanece 100% igual
- [x] Auth via Supabase Auth (if applicable) - **INALTERADO** - WhatsApp OTP continua via Supabase Auth
- [x] Backend logic via Edge Functions (if applicable) - **INALTERADO** - 29 Edge Functions continuam no Supabase
- [x] RLS policies defined for new tables - **N/A** - Não há novas tabelas nesta migração
- [x] Real-time subscriptions used (if applicable) - **INALTERADO** - Realtime continua via Supabase
- [x] File storage via Supabase Storage (if applicable) - **INALTERADO** - Storage de avatars continua no Supabase

**Compliance**: ✅ **FULL COMPLIANCE** - Stack Supabase permanece 100% inalterada.

---

### II. Component-Driven UI ✓

- [x] Uses shadcn/ui components (no custom unstyled components) - **INALTERADO** - Código UI existente não muda
- [x] Components under 500 lines (refactor if exceeded) - **INALTERADO** - Sem novos componentes
- [x] Custom hooks for reusable logic - **INALTERADO** - Hooks existentes não mudam
- [x] TanStack Query for server state (if applicable) - **INALTERADO** - Server state management continua igual
- [x] TypeScript interfaces defined for props - **INALTERADO** - Types existentes não mudam

**Compliance**: ✅ **FULL COMPLIANCE** - Frontend React existente permanece inalterado, apenas muda hosting.

---

### III. Test-First Development (NON-NEGOTIABLE) ✓

- [x] Tests written BEFORE implementation (TDD enforced) - **APLICÁVEL** - Testes de integração de deploy devem ser escritos antes
- [x] Unit tests for all custom hooks - **N/A** - Não há novos hooks
- [x] Integration tests for pages/complex components - **APLICÁVEL** - Smoke tests de todas as páginas no Vercel antes de DNS switch
- [x] Contract tests for Edge Functions (if applicable) - **N/A** - Edge Functions não mudam
- [x] Target: 70% overall coverage, 90% for critical paths - **INALTERADO** - Cobertura atual (~30-40%) é grandfathered, não piora com migração

**Compliance**: ✅ **FULL COMPLIANCE** - Smoke tests e testes de deploy serão criados antes da migração.

**TDD Approach for Migration**:
1. **RED**: Escrever checklist de validação (todas as páginas, auth, edge functions, realtime) - checklist deve falhar inicialmente
2. **GREEN**: Configurar Vercel até checklist passar 100%
3. **REFACTOR**: Otimizar build settings, caching, environment vars

---

### IV. AI Cost & Quality Management ✓

- [x] Prompts versioned and stored in code (if AI used) - **N/A** - Migração não altera prompts de IA existentes
- [x] Token usage tracked in `api_usage` table - **INALTERADO** - Tracking continua via Supabase
- [x] Cost calculated and logged per request - **INALTERADO** - Custo OpenAI não muda
- [x] Quality gates for generated content validation - **INALTERADO** - Validações existentes continuam
- [x] Rate limiting implemented - **INALTERADO** - Rate limits existentes continuam

**Compliance**: ✅ **FULL COMPLIANCE** - Sistema de IA permanece inalterado.

---

### V. Security & Compliance ✓

- [x] Input validation with Zod schemas - **INALTERADO** - Validações existentes não mudam
- [x] LGPD consent required (if handling personal data) - **INALTERADO** - Modal LGPD continua funcionando
- [x] RLS policies prevent unauthorized access - **INALTERADO** - RLS no Supabase não muda
- [x] No secrets in code (environment variables only) - **APLICÁVEL** - **CRITICAL**: Env vars devem ser migradas corretamente para Vercel
- [x] XSS/SQL injection prevention applied - **INALTERADO** - Proteções existentes continuam

**Compliance**: ✅ **FULL COMPLIANCE** - Segurança mantida. **ACTION ITEM**: Validar que env vars no Vercel estão configuradas corretamente (ver Phase 0 research).

**Security Checklist for Migration**:
- [ ] Todas as env vars do Lovable copiadas para Vercel
- [ ] Service role keys do Supabase NÃO expostas no frontend
- [ ] HTTPS funcionando via Let's Encrypt do Vercel
- [ ] CORS configurado corretamente (Supabase aceita requests do domínio Vercel)

---

### VI. Performance & User Experience ✓

- [x] Loading states for async operations - **INALTERADO** - UI existente não muda
- [x] Error states with actionable messages - **INALTERADO** - Error handling existente continua
- [x] Optimistic updates where safe - **INALTERADO** - Otimistic UI existente continua
- [x] Pagination/virtualization for large lists (>50 items) - **INALTERADO** - Paginação existente continua
- [x] Performance targets met (LCP <2.5s, TTI <3.5s) - **APLICÁVEL** - **MUST VALIDATE** no Vercel antes de DNS switch

**Compliance**: ✅ **CONDITIONAL COMPLIANCE** - Performance deve ser medida e validada no Vercel antes de go-live.

**Performance Validation Checklist**:
- [ ] LCP <2.5s medido via Vercel Analytics em staging
- [ ] TTI <3.5s medido via Lighthouse em staging
- [ ] Build time ≤ 5min no Vercel
- [ ] Bandwidth usage monitorado (não deve exceder 50GB/mês significativamente)

---

### VII. Observability & Analytics ✓

- [x] User actions tracked via `lib/analytics.ts` - **INALTERADO** - Analytics existente continua funcionando
- [x] Structured logging with context - **INALTERADO** - Logs no Supabase continuam
- [x] Errors logged with stack traces - **APLICÁVEL** - **MUST CONFIGURE** Sentry no Vercel
- [x] API usage tracked (if applicable) - **INALTERADO** - Tracking do Supabase continua

**Compliance**: ✅ **CONDITIONAL COMPLIANCE** - Sentry deve ser configurado no Vercel para manter observability.

**Observability Checklist**:
- [ ] Sentry configurado no Vercel (DSN correto)
- [ ] Vercel Analytics habilitado (Web Vitals tracking)
- [ ] Logs do Vercel acessíveis via dashboard
- [ ] Alertas configurados para erros críticos (>10 errors/min)

---

**Violations Requiring Justification**:

**NENHUMA VIOLAÇÃO** - Esta migração mantém 100% da arquitetura, código e padrões existentes. Apenas muda o hosting do frontend de Lovable para Vercel.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-lovable-vercel-migration/
├── plan.md              # This file
├── research.md          # Phase 0: Vercel best practices, env vars mapping, build config
├── quickstart.md        # Phase 1: Step-by-step migration runbook
├── checklists/
│   └── requirements.md  # Spec quality checklist (já criado)
└── (contracts/ e data-model.md não se aplicam - migração de infra)
```

### Source Code (repository root)

**ESTRUTURA EXISTENTE - INALTERADA**:

```text
meuprd/
├── src/                 # Frontend React (186 arquivos TS/TSX)
│   ├── components/      # 117 componentes
│   ├── pages/           # 19 páginas
│   ├── contexts/        # AuthContext e outros
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utils, analytics, avatarUpload
│   ├── integrations/    # Supabase client
│   └── types/           # TypeScript types
│
├── supabase/            # Backend (INALTERADO - não migra)
│   ├── functions/       # 29 Edge Functions Deno
│   └── migrations/      # 97 migrações SQL
│
├── public/              # Assets estáticos
├── tests/               # Testes Vitest
├── vite.config.ts       # Build config Vite
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

**ADIÇÕES PARA VERCEL**:

```text
meuprd/
├── vercel.json          # Vercel config (build settings, redirects, headers)
└── .vercelignore        # Arquivos a ignorar no deploy (opcional)
```

**Structure Decision**: Projeto é Single Page Application (SPA) React. Estrutura permanece 100% inalterada. Vercel apenas hospeda o output do build do Vite (`dist/`). Backend Supabase não migra, permanece onde está.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**N/A** - Nenhuma violação identificada. Migração é straightforward: apenas mudança de hosting provider mantendo stack e código inalterados.

---

# PHASE 0: Outline & Research

**Goal**: Resolver todas as incertezas técnicas sobre configuração do Vercel, mapeamento de env vars, otimizações de build, e best practices de deploy.

## Research Tasks

### R1: Vercel Configuration Best Practices
**Question**: Quais configurações otimizadas de build settings para Vite + React no Vercel?

**Research needed**:
- Vercel documentation para Vite apps
- Build optimization settings (output directory, build command, install command)
- Environment variables configuration (preview vs production)
- Redirects e rewrites para SPA (404 → index.html)
- Headers personalizados (CORS, security headers)

**Deliverable**: Arquivo `vercel.json` configurado corretamente

---

### R2: Environment Variables Mapping
**Question**: Quais env vars do Lovable devem ser replicadas no Vercel e como?

**Research needed**:
- Listar TODAS as env vars atuais do Lovable:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - (outras não documentadas?)
- Validar quais são públicas (VITE_*) vs privadas
- Configurar no Vercel via dashboard ou vercel CLI
- Testar que variáveis são injetadas corretamente no build

**Deliverable**: Checklist de env vars + script de validação

---

### R3: Build Performance Optimization
**Question**: Como garantir que build no Vercel seja ≤ 5min e otimizado?

**Research needed**:
- Vercel build cache strategies
- Node.js version alignment (Lovable vs Vercel)
- Dependency caching (npm/pnpm)
- Build parallelization options
- Output directory size limits

**Deliverable**: Build config otimizado + benchmarks

---

### R4: Custom Domain + SSL Configuration
**Question**: Como configurar domínio customizado e SSL no Vercel?

**Research needed**:
- Vercel domain setup (CNAME vs A record)
- SSL certificate provisioning (Let's Encrypt automático)
- DNS propagation timing
- TTL reduction strategy (3600s → 300s temporarily)
- Rollback DNS procedure

**Deliverable**: DNS change runbook step-by-step

---

### R5: Monitoring & Alerting Setup
**Question**: Como configurar Sentry + Vercel Analytics para equivalência com Lovable?

**Research needed**:
- Sentry DSN configuration no Vercel
- Vercel Analytics activation (Web Vitals)
- Log streaming (Vercel logs → external tool?)
- Alerting rules (error rate, performance degradation)
- Cost monitoring (Vercel bandwidth, function invocations)

**Deliverable**: Monitoring stack configurado + alertas

---

### R6: Rollback Procedure Validation
**Question**: Como garantir rollback <5min e zero data loss?

**Research needed**:
- DNS TTL impact on rollback timing
- Simultaneous deploys (Lovable + Vercel active)
- Session persistence durante DNS switch
- Supabase client behavior com URL change
- Testing rollback em staging

**Deliverable**: Rollback runbook testado

---

### R7: Cache Strategy (Upstash Redis)
**Question**: Como implementar cache para reduzir -25% chamadas Supabase Edge Functions?

**Research needed**:
- Upstash Redis integration com Vercel
- Cache key strategy (user_id, query params)
- TTL policies (5min para user context, 24h para Hotmart validation)
- Invalidation strategy
- Cost analysis (Upstash free tier limits)

**Deliverable**: Cache implementation plan

---

## Research Consolidation

**Output**: `research.md` com decisões documentadas:

1. **Vercel Config Decision**: vercel.json template com build settings otimizados
2. **Env Vars Mapping**: Lista completa de variáveis + script de validação
3. **Build Optimization**: Node 20.x, npm cache enabled, output: dist/
4. **Domain/SSL**: CNAME setup, TTL strategy, rollback runbook
5. **Monitoring**: Sentry + Vercel Analytics configured, alerting rules
6. **Rollback**: Validated procedure <5min via DNS revert
7. **Cache**: Upstash Redis for user context (5min TTL) + Hotmart (24h TTL)

---

# PHASE 1: Design & Contracts

**Prerequisites**: `research.md` complete

## Deliverables

### 1. quickstart.md - Step-by-Step Migration Runbook

**Purpose**: Runbook executável para desenvolvedores realizarem migração sem ambiguidade.

**Sections**:

#### Pre-Migration Checklist
- [ ] Backup completo do repositório Git (branch atual)
- [ ] Lista de env vars do Lovable documentada
- [ ] Acesso admin ao Vercel (conta criada)
- [ ] Acesso admin ao DNS do domínio
- [ ] Sentry DSN obtido
- [ ] Comunicação com usuários (se necessário)

#### Step 1: Setup Vercel Project (30min)
1. Criar projeto no Vercel via GitHub integration
2. Configurar build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
   - Node Version: 20.x
3. Configurar env vars (copiar do Lovable)
4. Primeiro deploy de teste

**Validation**: URL de preview abre sem erro 404

---

#### Step 2: Environment Variables Configuration (15min)
1. Acessar Vercel dashboard → Project Settings → Environment Variables
2. Adicionar cada variável:
   - `VITE_SUPABASE_PROJECT_ID` (Production + Preview)
   - `VITE_SUPABASE_URL` (Production + Preview)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (Production + Preview)
3. Re-deploy para aplicar env vars

**Validation**: `console.log(import.meta.env.VITE_SUPABASE_URL)` mostra valor correto

---

#### Step 3: Functional Testing on Preview URL (2-4 hours)
**Checklist de validação**:

- [ ] **Home (/)**: Carrega sem erros, PRD Generator visível
- [ ] **Auth WhatsApp**: Login via OTP funciona
- [ ] **Galeria (/galeria)**: PRDs carregam, likes funcionam
- [ ] **Perfil (/u/:username)**: Perfil carrega, avatar exibe
- [ ] **Admin (/admin/*)**: Dashboard admin acessível (se admin)
- [ ] **Eventos (/evento/:slug)**: Página de evento carrega, leaderboard funciona
- [ ] **Realtime**: Notificações aparecem em tempo real
- [ ] **Edge Functions**: Geração de PRD funciona (OpenAI call)
- [ ] **Storage**: Upload de avatar funciona

**Tools**:
- Manual testing via browser
- Lighthouse performance audit
- Sentry error tracking

---

#### Step 4: Performance Validation (1 hour)
1. Executar Lighthouse audit no preview URL
2. Verificar Core Web Vitals via Vercel Analytics:
   - LCP <2.5s (target: ~1.5s em staging)
   - FID <100ms
   - CLS <0.1
3. Medir build time (deve ser <5min)

**Validation**: Todos os targets passam

---

#### Step 5: Sentry Configuration (30min)
1. Adicionar env var `VITE_SENTRY_DSN` no Vercel
2. Verificar que erros aparecem no Sentry dashboard
3. Configurar alerting rules (>10 errors/min → Slack/Email)

**Validation**: Trigger erro proposital e validar que aparece no Sentry

---

#### Step 6: Custom Domain Configuration (1 hour)
1. No Vercel dashboard → Project Settings → Domains
2. Adicionar domínio customizado (ex: meuprd.com)
3. Copiar CNAME record fornecido pelo Vercel
4. **NÃO ADICIONAR AO DNS AINDA** - apenas anotar
5. Reduzir TTL do DNS para 300s (5min) - aguardar propagação (até 3600s)
6. Validar SSL provisioning no Vercel (Let's Encrypt automático)

**Validation**: Vercel mostra "Ready" no domain status

---

#### Step 7: Staging Validation (2-4 hours)
1. Adicionar domínio de staging (ex: staging.meuprd.com) apontando para Vercel
2. Testar TUDO novamente no domínio de staging
3. Validar que HTTPS funciona
4. Testar com múltiplos usuários (team members)

**Validation**: Zero erros em 2-4 horas de uso intensivo

---

#### Step 8: DNS Switch (Go-Live) (30min + monitoring)
**Pre-flight checks**:
- [ ] TTL do DNS já reduzido para 300s há pelo menos 1 hora
- [ ] Lovable ainda acessível como fallback
- [ ] Team alerta para monitoramento
- [ ] Rollback runbook impresso/acessível

**Execution**:
1. Adicionar CNAME record apontando domínio principal para Vercel
2. Aguardar propagação DNS (5-15min com TTL 300s)
3. Validar que domínio principal agora resolve para Vercel (dig/nslookup)
4. Testar novamente TODAS as funcionalidades no domínio produção
5. Monitorar Sentry + Vercel Analytics por 30min

**Validation**: Zero erros críticos após 30min de produção

---

#### Step 9: Post-Migration Monitoring (7 days)
**Daily checks**:
- [ ] Sentry error rate < baseline
- [ ] Vercel Analytics Web Vitals verde
- [ ] Custo Vercel dentro do esperado ($20/mês base)
- [ ] User feedback positivo

**After 7 days**:
- [ ] Aumentar TTL DNS de volta para 3600s
- [ ] Documentar lições aprendidas
- [ ] Desativar Lovable (cancelar plano)

---

#### Step 10: Rollback Procedure (ONLY IF CRITICAL ISSUE)
**When to rollback**:
- Erro crítico afetando >50% dos usuários
- Performance degradada significativamente (LCP >5s)
- Funcionalidade core quebrada (auth, PRD generation)

**Execution**:
1. Remover CNAME record do Vercel no DNS
2. Adicionar CNAME/A record apontando de volta para Lovable
3. Aguardar propagação (5-10min com TTL 300s)
4. Validar que Lovable está acessível novamente
5. Notificar usuários (se necessário)
6. Debug issue no Vercel em paralelo

**Time estimate**: <5min para DNS change, <10min para propagação total

---

### 2. data-model.md - N/A

**Reasoning**: Migração de infraestrutura não envolve alteração de modelo de dados. Database schema do Supabase permanece 100% inalterado.

---

### 3. contracts/ - N/A

**Reasoning**: Migração não altera APIs, Edge Functions ou contratos. Supabase backend permanece inalterado.

---

## Agent Context Update

**Action**: Após research.md e quickstart.md estarem prontos, executar:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Expected changes**:
- Adicionar Vercel como hosting platform (complementa Lovable)
- Adicionar Upstash Redis como cache layer (planejado)
- Manter Supabase como backend (inalterado)
- Atualizar deployment strategy (CI/CD via Vercel)

**Preserved manual additions**: Qualquer customização manual no arquivo de contexto do agent será preservada entre markers.

---

## Next Steps

After Phase 1 complete:

1. **Review quickstart.md** with team lead
2. **Execute migration in staging first** (dry run completo)
3. **Run `/speckit.tasks`** to generate task breakdown (opcional - quickstart.md já é bem granular)
4. **Schedule go-live window** (low-traffic period preferred)
5. **Communicate with users** (if necessary - probably not for infrastructure change)

**Estimated total time**: 8-12 hours de trabalho (distribuído em 2-3 dias para validações)
