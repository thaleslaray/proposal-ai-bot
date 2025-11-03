# Quickstart: Migração Lovable → Vercel

**Purpose**: Runbook executável passo-a-passo para migração zero-downtime do frontend React/Vite de Lovable para Vercel.

**Estimated Time**: 8-12 horas de trabalho distribuídas em 2-3 dias

**Prerequisites**: Acesso admin ao Vercel, GitHub, DNS, e Sentry

---

## Pre-Migration Checklist

Execute estes steps ANTES de começar a migração:

- [ ] Backup completo do repositório Git (`git clone --mirror`)
- [ ] Lista de env vars do Lovable documentada (screenshot ou arquivo)
- [ ] Conta Vercel criada e verificada (Pro plan $20/mês)
- [ ] Acesso admin ao DNS do domínio (login testado)
- [ ] Sentry DSN obtido (projeto criado no Sentry.io)
- [ ] Comunicação com usuários agendada (se necessário - provavelmente não para migração de infra)
- [ ] Time alinhado com janela de migração (data + horário definidos)
- [ ] Rollback runbook impresso ou acessível offline

**Validation**: Todos os itens marcados antes de prosseguir.

---

## Step 1: Setup Vercel Project

**Duration**: 30 minutos
**Owner**: DevOps/Lead Developer

### 1.1 Create Vercel Project via GitHub Integration

1. Acessar [https://vercel.com/new](https://vercel.com/new)
2. Clicar em "Import Git Repository"
3. Selecionar repositório GitHub `thaleslaray/meuprd`
4. Configurar settings do projeto:

   **Framework Preset**: Vite
   **Root Directory**: `./` (padrão - não mudar)
   **Build Command**: `npm run build` (ou deixar padrão)
   **Output Directory**: `dist` (Vite padrão)
   **Install Command**: `npm install` (ou deixar padrão)
   **Node.js Version**: 20.x (selecionar nas settings)

5. **NÃO clicar em Deploy ainda** - configurar env vars primeiro

### 1.2 Configure Build Settings

1. Ir em Project Settings → General → Build & Development Settings
2. Verificar que:
   - Framework Preset: **Vite** ✓
   - Build Command: **`npm run build`** ✓
   - Output Directory: **`dist`** ✓
   - Install Command: **`npm install`** ✓
3. Em Node.js Version: selecionar **20.x** (latest LTS)

### 1.3 First Test Deploy (will fail without env vars - expected)

1. Voltar para tab Deployments
2. Clicar "Deploy" pela primeira vez
3. **Esperado**: Build vai PASSAR mas app vai ter erros de runtime (env vars faltando)
4. Anotar URL de preview: `https://meuprd-<hash>.vercel.app`

**Validation**:
- [x] Build completa sem erros (duração ~3-5min)
- [x] URL de preview acessível (mesmo que com erros de runtime)
- [x] Logs do build não mostram falhas críticas

---

## Step 2: Environment Variables Configuration

**Duration**: 15 minutos
**Owner**: DevOps

### 2.1 List All Environment Variables from Lovable

From Lovable dashboard or `.env` file, copy these variables:

```bash
VITE_SUPABASE_PROJECT_ID=ioaqszmayxuqbdmzdpkx
VITE_SUPABASE_URL=https://ioaqszmayxuqbdmzdpkx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ[...rest of key]
```

**NEW variable to add (Sentry)**:
```bash
VITE_SENTRY_DSN=https://[your-sentry-dsn]@sentry.io/[project-id]
```

### 2.2 Add Variables to Vercel

1. No Vercel dashboard → Project Settings → Environment Variables
2. Para cada variável, fazer:

   **Variable Name**: `VITE_SUPABASE_PROJECT_ID`
   **Value**: `ioaqszmayxuqbdmzdpkx`
   **Environments**: ✓ Production, ✓ Preview, ✓ Development
   → Clicar "Save"

3. Repetir para todas as 4 variáveis (3 do Supabase + 1 do Sentry)

### 2.3 Re-deploy to Apply Env Vars

1. Ir em Deployments
2. Clicar nos 3 dots do último deployment
3. Selecionar "Redeploy"
4. Aguardar novo deployment (~3-5min)
5. Acessar novo URL de preview

### 2.4 Validate Env Vars Are Injected

1. Abrir DevTools (F12) no browser
2. Na console, digitar:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   ```
3. **Esperado**: Mostrar `https://ioaqszmayxuqbdmzdpkx.supabase.co`
4. Se mostrar `undefined`, env vars não foram aplicadas - repetir step 2.2

**Validation**:
- [x] Todas as 4 env vars adicionadas no Vercel
- [x] Re-deploy executado com sucesso
- [x] `import.meta.env.VITE_SUPABASE_URL` retorna valor correto no console

---

## Step 3: Functional Testing on Preview URL

**Duration**: 2-4 horas
**Owner**: QA + Developer
**Tools**: Browser, Lighthouse, manual testing

### 3.1 Core Functionality Checklist

Acessar URL de preview `https://meuprd-<hash>.vercel.app` e testar:

#### 3.1.1 Home Page (/)
- [ ] Página carrega sem erros 404/500
- [ ] PRD Generator visível
- [ ] Textarea de input aceita texto
- [ ] Botão de geração está presente
- [ ] TopBar/Navigation renderiza corretamente

#### 3.1.2 Authentication WhatsApp OTP
- [ ] Clicar em "Entrar" abre modal de auth
- [ ] Input de telefone aceita número internacional
- [ ] Clicar "Enviar código" invoca Edge Function `send-whatsapp-otp`
- [ ] Código OTP chega no WhatsApp (testar com telefone real)
- [ ] Inserir código correto faz login (session criada)
- [ ] Após login, ver nome do usuário no TopBar
- [ ] Logout funciona (session destruída)

#### 3.1.3 Galeria (/galeria)
- [ ] Navegar para /galeria
- [ ] Lista de PRDs carrega (skeleton loader → content)
- [ ] Scroll infinite funciona (carregar mais PRDs)
- [ ] Clicar em PRD abre detalhes
- [ ] Botão de Like funciona (toggle like)
- [ ] Filtros de categoria funcionam
- [ ] Busca por texto funciona

#### 3.1.4 Perfil de Usuário (/u/:username)
- [ ] Navegar para /u/[seu-username]
- [ ] Perfil carrega com dados corretos
- [ ] Avatar exibe (se cadastrado)
- [ ] Lista de PRDs do usuário carrega
- [ ] Links sociais funcionam (se cadastrados)
- [ ] Badges aparecem (se houver)

#### 3.1.5 Editar Perfil (/editar-perfil)
- [ ] Navegar para /editar-perfil (requer auth)
- [ ] Formulário carrega com dados atuais
- [ ] Upload de avatar funciona (Supabase Storage)
- [ ] Salvar alterações funciona (profile updated)
- [ ] Mudanças refletem imediatamente

#### 3.1.6 Admin Dashboard (/admin/*)
**SE VOCÊ FOR ADMIN:**
- [ ] Navegar para /admin
- [ ] Dashboard carrega (verificar role admin)
- [ ] Gráficos e estatísticas carregam
- [ ] User management acessível
- [ ] Event management acessível

**SE NÃO FOR ADMIN:**
- [ ] /admin redireciona para home ou mostra 403

#### 3.1.7 Eventos (/evento/:slug)
**Se houver evento ativo:**
- [ ] Navegar para /evento/[slug]
- [ ] Página de evento carrega
- [ ] Leaderboard exibe participantes
- [ ] Inscrever-se no evento funciona
- [ ] Geração de PRD com pontos funciona

#### 3.1.8 Realtime Features
- [ ] Login em 2 browsers diferentes (ou janela anônima)
- [ ] Dar like em PRD no browser A
- [ ] Verificar que contador de likes atualiza em tempo real no browser B
- [ ] Criar notificação (ex: adicionar usuário a evento)
- [ ] Verificar que notificação aparece em tempo real

#### 3.1.9 Edge Functions Integration
- [ ] Gerar PRD (invoca `generate-prd` Edge Function)
- [ ] Verificar que PRD é criado com sucesso (OpenAI call funciona)
- [ ] Categorização automática funciona
- [ ] Metadata extraction funciona
- [ ] Tracking de api_usage registra chamada

#### 3.1.10 Storage (Supabase)
- [ ] Upload de avatar funciona (Supabase Storage)
- [ ] Avatar exibe corretamente (getPublicUrl funciona)
- [ ] Deletar avatar antigo funciona (ao fazer novo upload)

### 3.2 Error Scenarios Testing

- [ ] Tentar acessar /admin sem estar logado → Redirect para login
- [ ] Tentar acessar /editar-perfil sem auth → Redirect para login
- [ ] Gerar PRD sem estar logado → Modal de auth abre
- [ ] Atingir limite diário de PRDs (free tier) → Modal de upgrade aparece
- [ ] Network error simulado (DevTools offline) → Error states aparecem

### 3.3 Performance Testing

- [ ] Abrir Lighthouse (DevTools → Lighthouse → Run Audit)
- [ ] Performance score: **target ≥80**
- [ ] Accessibility score: **target ≥90**
- [ ] Best Practices score: **target ≥90**
- [ ] SEO score: **target ≥80**

**Validation**:
- [x] TODOS os 50+ checkpoints passam
- [x] ZERO erros críticos no console
- [x] Lighthouse performance ≥80

**If failures**: Debug via Vercel logs, Sentry errors, browser DevTools. Fix issues before proceeding.

---

## Step 4: Performance Validation

**Duration**: 1 hora
**Owner**: Developer

### 4.1 Lighthouse Audit

1. Abrir preview URL no Chrome (modo anônimo)
2. DevTools → Lighthouse
3. Selecionar:
   - ✓ Performance
   - ✓ Accessibility
   - ✓ Best Practices
   - ✓ SEO
   - Device: Desktop (ou Mobile para teste adicional)
4. Clicar "Analyze page load"
5. Aguardar relatório (~30s)

**Target Scores**:
- Performance: **≥80** (target ideal: 90+)
- Accessibility: **≥90**
- Best Practices: **≥90**
- SEO: **≥80**

### 4.2 Core Web Vitals via Vercel Analytics

1. No Vercel dashboard → projeto → Analytics
2. Verificar tab "Web Vitals"
3. **Aguardar pelo menos 30min de tráfego** (ou testar manualmente 10-20 page loads)

**Target Metrics**:
- **LCP** (Largest Contentful Paint): **<2.5s** (75th percentile)
- **FID** (First Input Delay): **<100ms** (75th percentile)
- **CLS** (Cumulative Layout Shift): **<0.1** (75th percentile)

### 4.3 Build Time Validation

1. No Vercel dashboard → Deployments → último deployment
2. Verificar duração do build em "Build Logs"

**Target**: ≤ **5 minutos**
**Current baseline (Lovable)**: ~3-4 minutos

Se build time >5min, investigar:
- Dependency cache não funcionando (npm cache)
- Muitos arquivos grandes sendo bundled
- Vite config não otimizado (verificar research.md R3)

### 4.4 Bundle Size Analysis

1. Executar local build com analyzer:
   ```bash
   npm run build
   ```
2. Verificar output do Vite na console:
   ```
   dist/index.html                   0.50 kB
   dist/assets/index-<hash>.js       450.32 kB
   dist/assets/vendor-<hash>.js      180.15 kB
   ```

**Target**: Bundle inicial (JS gzipped) < **500 KB**

Se >500KB, considerar:
- Code splitting agressivo (lazy load admin pages, eventos)
- Tree shaking de dependências não usadas
- Trocar bibliotecas pesadas (ex: moment.js → date-fns)

**Validation**:
- [x] Lighthouse Performance ≥80
- [x] LCP <2.5s, FID <100ms, CLS <0.1
- [x] Build time ≤5min
- [x] Bundle size <500KB gzipped

---

## Step 5: Sentry Configuration

**Duration**: 30 minutos
**Owner**: Developer

### 5.1 Add Sentry DSN to Vercel

1. No Vercel dashboard → Project Settings → Environment Variables
2. Adicionar:

   **Variable Name**: `VITE_SENTRY_DSN`
   **Value**: `https://[your-key]@[org].ingest.sentry.io/[project-id]`
   **Environments**: ✓ Production, ✓ Preview
   → Save

3. Re-deploy para aplicar

### 5.2 Verify Sentry Initialization

1. Acessar preview URL
2. Abrir DevTools → Console
3. **Esperado**: Ver mensagem `[Sentry] Initialized` ou similar
4. Se não ver, verificar código em `src/main.tsx` (deve ter `Sentry.init()`)

### 5.3 Test Error Reporting

1. No preview URL, abrir console do DevTools
2. Executar código que gera erro proposital:
   ```javascript
   throw new Error('Test Sentry error - ignore this');
   ```
3. Aguardar 10-30 segundos
4. Acessar Sentry dashboard → Issues
5. **Esperado**: Ver novo issue "Test Sentry error - ignore this"

### 5.4 Configure Alerting Rules

1. No Sentry dashboard → projeto → Alerts
2. Criar nova regra:

   **Rule Name**: High Error Rate - Vercel
   **Conditions**: When event count > 10 in 1 minute
   **Actions**: Send notification to Slack (ou Email)

3. Salvar regra

### 5.5 Test Alert (Optional)

1. Gerar 11+ erros rapidamente (script ou manual)
2. Verificar que alerta dispara em Slack/Email

**Validation**:
- [x] Sentry DSN configurado no Vercel
- [x] Erros aparecem no Sentry dashboard
- [x] Alerting rule configurada
- [x] Stack traces são legíveis (source maps funcionando)

---

## Step 6: Custom Domain Configuration

**Duration**: 1 hora
**Owner**: DevOps + Domain Admin

### 6.1 Add Custom Domain to Vercel

1. No Vercel dashboard → Project Settings → Domains
2. Clicar "Add Domain"
3. Inserir domínio: **`meuprd.com`** (ou seu domínio)
4. Vercel mostra DNS records necessários:
   ```
   Type: CNAME
   Name: @  (ou meuprd.com)
   Value: cname.vercel-dns.com
   ```
5. **NÃO ADICIONAR AO DNS AINDA** - apenas copiar e anotar

### 6.2 Add Staging Domain (Recommended)

1. Repetir step 6.1 mas com subdomínio: **`staging.meuprd.com`**
2. Anotar CNAME record:
   ```
   Type: CNAME
   Name: staging
   Value: cname.vercel-dns.com
   ```

### 6.3 Reduce DNS TTL (Prepare for Fast Switch)

1. Acessar painel DNS do domínio (ex: Cloudflare, Route53, GoDaddy)
2. Localizar record atual que aponta para Lovable
3. **Reduzir TTL** de 3600s (1 hora) para **300s (5 minutos)**
4. Salvar alteração
5. **Aguardar pelo menos 1 hora** para TTL antigo expirar globalmente

**Why?** TTL baixo permite rollback rápido (<5min) em caso de problemas.

### 6.4 Add Staging Domain to DNS (Test First)

1. No painel DNS, adicionar novo record:
   ```
   Type: CNAME
   Name: staging
   Value: cname.vercel-dns.com
   TTL: 300
   ```
2. Salvar
3. Aguardar propagação (~5-15 minutos)
4. Testar com `dig`:
   ```bash
   dig staging.meuprd.com
   ```
   **Esperado**: Resposta aponta para Vercel (cname.vercel-dns.com)

### 6.5 Validate SSL Provisioning

1. No Vercel dashboard → Domains
2. Verificar status do domínio staging:
   - **Valid Configuration** ✓
   - **SSL Certificate: Active** ✓ (Let's Encrypt automático)
3. Acessar `https://staging.meuprd.com`
4. Verificar que HTTPS funciona (cadeado verde no browser)

**Validation**:
- [x] Custom domain adicionado ao Vercel (production + staging)
- [x] DNS TTL reduzido para 300s
- [x] Staging domain apontando para Vercel via CNAME
- [x] SSL ativo e funcionando em staging

---

## Step 7: Staging Validation

**Duration**: 2-4 horas
**Owner**: QA Team + Developers

### 7.1 Full Regression Testing on Staging Domain

**Repeat ALL tests from Step 3** mas agora em `https://staging.meuprd.com`:

- [ ] Home page (/)
- [ ] WhatsApp Auth (login + logout)
- [ ] Galeria (/galeria)
- [ ] Perfil (/u/:username)
- [ ] Editar perfil
- [ ] Admin dashboard (se aplicável)
- [ ] Eventos (se aplicável)
- [ ] Realtime features
- [ ] Edge Functions (generate-prd)
- [ ] Storage (avatar upload)
- [ ] All error scenarios
- [ ] Lighthouse performance

### 7.2 Cross-Browser Testing

Testar em múltiplos browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest) - se macOS disponível
- [ ] Edge (latest)
- [ ] Mobile Chrome (Android ou DevTools emulation)
- [ ] Mobile Safari (iOS ou DevTools emulation)

### 7.3 Team User Acceptance Testing

1. Convidar 2-3 team members para testar staging
2. Dar lista de cenários para testar (copiar do Step 3)
3. Coletar feedback:
   - Bugs encontrados?
   - Performance issues?
   - UX problems?

### 7.4 Load Testing (Optional but Recommended)

Se tiver ferramenta de load testing (ex: k6, Artillery, JMeter):
1. Simular 100 usuários simultâneos acessando homepage
2. Verificar que:
   - Response time <2s (95th percentile)
   - Error rate <1%
   - Vercel não throttle requests

**Validation**:
- [x] Zero erros em 2-4 horas de uso intensivo no staging
- [x] Todos os browsers testados funcionam
- [x] Team UAT aprovado
- [x] Load test passa (se executado)

**If any failures**: Fix bugs, re-deploy, re-test. **DO NOT proceed to production DNS switch until staging is 100% stable.**

---

## Step 8: DNS Switch (Go-Live)

**Duration**: 30 minutos + 30 minutos de monitoring
**Owner**: DevOps Lead + Team on Standby

### Pre-Flight Checks (T-60 minutes before DNS switch)

- [ ] TTL do DNS reduzido para 300s há pelo menos 1 hora
- [ ] Staging validado 100% (Step 7 completo)
- [ ] Lovable ainda acessível como fallback
- [ ] Team alerta e disponível para monitoramento
- [ ] Rollback runbook impresso ou acessível offline (Step 10)
- [ ] Sentry configurado e alertas ativos
- [ ] Vercel Analytics habilitado
- [ ] Comunicação com usuários enviada (se aplicável - provavelmente não para migração de infra)

### 8.1 DNS Switch Execution (T-0)

1. Acessar painel DNS do domínio
2. Localizar record atual que aponta para Lovable (ex: `@` ou `meuprd.com`)
3. **Editar** o record (ou deletar + criar novo):

   **Antes (Lovable)**:
   ```
   Type: A ou CNAME
   Name: @
   Value: [lovable-ip-ou-cname]
   TTL: 300
   ```

   **Depois (Vercel)**:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   TTL: 300
   ```

4. **Salvar** alteração
5. Anotar timestamp exato do switch: **[  :  ]**

### 8.2 Monitor DNS Propagation (T+5 to T+15 minutes)

1. Aguardar 5 minutos após DNS switch
2. Testar resolução DNS:
   ```bash
   dig meuprd.com
   dig meuprd.com @8.8.8.8  # Google DNS
   dig meuprd.com @1.1.1.1  # Cloudflare DNS
   ```
3. **Esperado**: Ver `cname.vercel-dns.com` nas respostas
4. Se ainda mostra Lovable IP, aguardar mais 5-10 min (TTL propagation)

### 8.3 Validate Production Domain

1. Acessar `https://meuprd.com` (domínio produção)
2. Verificar que:
   - [x] Página carrega sem erros
   - [x] HTTPS funciona (cadeado verde)
   - [x] SSL certificate é do Vercel (inspecionar cert)
   - [x] URL resolve para Vercel (não Lovable)

### 8.4 Smoke Testing on Production (T+15 to T+30 minutes)

**Critical paths only** (teste rápido):
- [ ] Homepage carrega
- [ ] WhatsApp login funciona
- [ ] Gerar PRD funciona
- [ ] Galeria carrega
- [ ] Perfil de usuário acessível

**If ANY critical path fails → Execute rollback immediately (Step 10)**

### 8.5 Monitor Sentry + Vercel Analytics (T+30 to T+60 minutes)

1. **Sentry Dashboard**:
   - Error rate: **target <5 errors/min**
   - New issues: **target 0 new critical issues**
   - Performance: **target p95 latency <2s**

2. **Vercel Analytics**:
   - Real-time traffic: **verify traffic is coming to Vercel**
   - Error rate: **target <1%**
   - Web Vitals: **LCP <2.5s, FID <100ms**

3. **Vercel Logs**:
   - No 500 errors em massa
   - Build logs limpos

**Validation**:
- [x] Zero erros críticos após 30min de produção
- [x] Sentry error rate normal (<5/min)
- [x] Vercel Analytics verde
- [x] Users reporting no issues (monitor support channels)

**If major issues detected → Execute rollback (Step 10)**

---

## Step 9: Post-Migration Monitoring

**Duration**: 7 days
**Owner**: DevOps + Support Team

### Daily Monitoring Checklist (Days 1-7)

**Every day at same time (ex: 10am)**:

- [ ] **Sentry Error Rate**: Comparar com baseline pre-migration (<baseline +20%)
- [ ] **Vercel Analytics Web Vitals**: LCP, FID, CLS verdes (≥90% good)
- [ ] **Vercel Cost Dashboard**: Dentro do budget ($20/mês base, bandwidth ~$18)
- [ ] **User Feedback**: Tickets de suporte relacionados a performance/downtime? (target: 0)
- [ ] **Active Users**: Comparar com métrica pre-migration (não deve cair >10%)

### Weekly Deep Dive (Day 7)

1. **Performance Comparison Report**:
   - LCP: Lovable vs Vercel (target: igual ou melhor)
   - Build time: Lovable vs Vercel (target: igual ou melhor)
   - Error rate: Lovable vs Vercel (target: igual ou menor)

2. **Cost Analysis**:
   - Vercel bill após 7 dias (projeção mensal)
   - Comparar com Lovable ($20/mês)
   - **Target**: ≤ custo anterior

3. **User Satisfaction**:
   - NPS score (se coletado)
   - Support ticket volume (deve manter ou reduzir)
   - User-reported performance issues (target: 0 críticos)

### Post-Migration Actions (Day 7)

**If all metrics green após 7 dias**:
- [ ] **Aumentar TTL DNS** de 300s de volta para 3600s (1 hora)
- [ ] **Documentar lições aprendidas** em `docs/migrations/lovable-to-vercel.md`
- [ ] **Cancelar plano Lovable** (só após DNS TTL aumentado!)
- [ ] **Archive Lovable deployment** (manter código por mais 30 dias como backup)
- [ ] **Celebrate!** 🎉 Migração bem-sucedida

**Validation**:
- [x] 7 dias de monitoramento sem issues críticos
- [x] Métricas de performance ≥ baseline
- [x] Custo dentro do orçamento
- [x] User satisfaction mantida ou melhorada
- [x] Lições aprendidas documentadas

---

## Step 10: Rollback Procedure (EMERGENCY ONLY)

**Duration**: <5 minutos DNS change + <10 minutos propagation
**Owner**: DevOps Lead

### When to Rollback?

Execute rollback **APENAS SE**:
- ✗ Erro crítico afetando **>50% dos usuários** (ex: auth quebrada)
- ✗ Performance degradada significativamente (**LCP >5s** consistentemente)
- ✗ Funcionalidade core completamente quebrada (ex: não consegue gerar PRD)
- ✗ **Complete downtime** (site inacessível)

**DO NOT rollback for**:
- Minor bugs não críticos (fix forward no Vercel)
- Performance issues localizadas (<10% users)
- Erros de edge cases (fix e re-deploy)

### Rollback Execution

#### 1. Announce Rollback (T-0)

1. Notificar team imediatamente:
   ```
   ALERTA: Executando rollback Vercel → Lovable devido a [razão crítica].
   DNS será revertido em 2 minutos. Standby para validação.
   ```

#### 2. Revert DNS (T+2 minutes)

1. Acessar painel DNS do domínio
2. **Editar** record `@` (ou `meuprd.com`):

   **Vercel (current - broken)**:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   TTL: 300
   ```

   **Lovable (revert to this)**:
   ```
   Type: [A ou CNAME - usar config original]
   Name: @
   Value: [lovable-ip-ou-cname - usar valor original anotado]
   TTL: 300
   ```

3. **Salvar** alteração
4. Anotar timestamp de rollback: **[  :  ]**

#### 3. Monitor DNS Propagation (T+2 to T+10 minutes)

1. Aguardar 2 minutos
2. Testar resolução DNS:
   ```bash
   dig meuprd.com
   ```
3. **Esperado**: Ver Lovable IP/CNAME nas respostas (não mais Vercel)
4. Se ainda mostra Vercel, aguardar mais 3-5 min (TTL 300s)

#### 4. Validate Lovable is Accessible (T+10 minutes)

1. Acessar `https://meuprd.com`
2. Verificar que:
   - [x] Página carrega (Lovable UI, não Vercel)
   - [x] Auth funciona
   - [x] Gerar PRD funciona
   - [x] Galeria acessível
   - [x] **Todos os critical paths funcionam**

#### 5. Notify Team & Users (T+15 minutes)

1. **Team notification**:
   ```
   ✓ Rollback concluído. Lovable está ativo novamente.
   Site funcionando normalmente. Investigação do problema Vercel iniciada.
   ```

2. **User notification** (se downtime foi >5min):
   ```
   [Tweet/Email/Status Page]
   Resolvemos um problema temporário. O site está funcionando normalmente.
   Agradecemos sua paciência!
   ```

#### 6. Debug Vercel Issue in Parallel (T+15 onwards)

1. **NO PRESSURE** - Lovable está servindo usuários normalmente
2. Investigar root cause do problema no Vercel:
   - Vercel logs
   - Sentry errors
   - Build logs
   - Env vars missing?
3. Fix issue em branch separada
4. Re-test em preview URL
5. **Only attempt DNS switch again quando problema 100% resolvido**

### Rollback Validation

- [x] DNS revertido em <5min
- [x] Lovable acessível em <10min (incluindo propagação)
- [x] Zero data loss (Supabase é source of truth, não mudou)
- [x] User sessions preservadas (Supabase Auth não afetado)
- [x] Team e usuários notificados
- [x] Root cause identificado e fix planejado

---

## Post-Migration Optimization (Optional - After Day 7)

**If migration successful, consider these optimizations**:

### 1. Implement Cache Layer (Upstash Redis)

**Ref**: research.md R7

- Hotmart validation cache (24h TTL) - reduz 95% das calls
- User profile cache (5min TTL) - reduz 40% das calls
- **Expected savings**: -25% Supabase Edge Function calls = ~$8-12/mês

### 2. Code Splitting Optimization

- Lazy load admin pages (`React.lazy()`)
- Lazy load event pages
- Lazy load gallery (if not critical path)
- **Expected impact**: Bundle size -30% = faster LCP

### 3. Image Optimization

- Convert avatars to WebP format (via Supabase Function)
- Implement lazy loading (Intersection Observer)
- Add blur placeholders (lqip)
- **Expected impact**: LCP improvement ~20%

### 4. Upgrade to Vercel Pro Features (If Needed)

- Increase concurrent builds (if team growing)
- Enable Advanced Analytics (deeper insights)
- Add Performance Monitoring (custom metrics)
- **Cost**: Included in Pro ($20/mês)

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue: Build Fails on Vercel

**Symptoms**: Deployment status "Error", build logs show errors

**Solutions**:
1. Check Node.js version (must be 20.x)
2. Check `package.json` scripts (must have `"build": "vite build"`)
3. Check TypeScript errors (run `npm run build` locally)
4. Check env vars are set (missing VITE_* vars)

**Fix**: Update settings in Vercel dashboard → Project Settings → Build & Development

---

#### Issue: Site Loads but Errors in Console

**Symptoms**: Page renders but console shows Supabase errors

**Solutions**:
1. Verify env vars are set correctly:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
   ```
2. Check CORS settings in Supabase (allow Vercel domain)
3. Check RLS policies (might be blocking queries)

**Fix**: Add Vercel preview domain to Supabase allowed origins if needed

---

#### Issue: WhatsApp OTP Not Working

**Symptoms**: Cannot login, OTP not received

**Solutions**:
1. Check Edge Function `send-whatsapp-otp` is accessible (Supabase side, not Vercel)
2. Verify env vars include Supabase keys (frontend calls backend)
3. Test OTP flow in Lovable to isolate issue

**Fix**: This is likely NOT a Vercel issue - Supabase backend unchanged

---

#### Issue: Slow Performance (LCP >3s)

**Symptoms**: Lighthouse score <60, slow page loads

**Solutions**:
1. Check bundle size (might be too large):
   ```bash
   npm run build
   # Look for large chunks in output
   ```
2. Implement code splitting (React.lazy for admin pages)
3. Optimize images (WebP, lazy loading)
4. Check Vercel region (should be closest to users)

**Fix**: Apply optimizations from research.md R3

---

#### Issue: SSL Certificate Not Provisioning

**Symptoms**: Vercel shows "Invalid configuration" or "SSL pending"

**Solutions**:
1. Verify DNS CNAME points to `cname.vercel-dns.com` (not IP)
2. Wait up to 24 hours for Let's Encrypt provisioning (usually <10min)
3. Check domain is not behind Cloudflare Proxy (orange cloud) - must be DNS only (gray cloud)

**Fix**: Update DNS settings or wait for provisioning

---

#### Issue: Rollback Needed But DNS Not Updating

**Symptoms**: Revert DNS but site still shows Vercel

**Solutions**:
1. Check TTL - might still be cached (wait TTL duration)
2. Flush DNS cache locally:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   # Windows
   ipconfig /flushdns
   ```
3. Test with different DNS (Google 8.8.8.8, Cloudflare 1.1.1.1)

**Fix**: Wait for global DNS propagation (up to 300s with TTL=300s)

---

## Appendix: Useful Commands

### DNS Testing
```bash
# Test DNS resolution
dig meuprd.com
dig meuprd.com @8.8.8.8  # Google DNS
dig meuprd.com @1.1.1.1  # Cloudflare DNS

# Test with specific DNS server
nslookup meuprd.com 8.8.8.8
```

### SSL Testing
```bash
# Check SSL certificate
openssl s_client -connect meuprd.com:443 -servername meuprd.com < /dev/null

# Test SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=meuprd.com
```

### Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from local
vercel

# List deployments
vercel ls

# View logs
vercel logs [deployment-url]

# Promote deployment to production
vercel promote [deployment-url]
```

### Performance Testing
```bash
# Lighthouse via CLI
npm install -g lighthouse
lighthouse https://meuprd.com --view

# Bundle analyzer
npm install -g source-map-explorer
npm run build
source-map-explorer dist/assets/*.js
```

---

## Success Criteria Checklist

**Migration is considered successful when**:

- [x] All functional tests pass (Step 3)
- [x] Performance meets targets: LCP <2.5s, TTI <3.5s, Build <5min
- [x] Sentry configured and capturing errors
- [x] Production DNS switched and accessible
- [x] Zero critical errors for 30min post-switch
- [x] 7 days of monitoring without major issues
- [x] Cost within budget ($20/mês Vercel ≤ $20/mês Lovable)
- [x] User satisfaction maintained (no spike in support tickets)
- [x] Rollback procedure validated and documented

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Owner**: DevOps Team
**Review Date**: Post-migration (Day 7)
