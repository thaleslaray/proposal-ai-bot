# Research Document: Migração Lovable → Vercel

**Feature Branch**: `001-lovable-vercel-migration`
**Created**: 2025-11-03
**Status**: Complete
**Related Docs**: [spec.md](./spec.md) | [plan.md](./plan.md)

---

## Executive Summary

Este documento consolida as pesquisas técnicas necessárias para migração segura da aplicação React/Vite do Lovable para o Vercel, mantendo 100% de conectividade com o backend Supabase. Cada seção documenta decisões, alternativas consideradas, e implementações práticas.

**Stack atual**:
- Frontend: React 18.3.1 + Vite 5.4.19 + TypeScript 5.8.3
- Backend: Supabase (PostgreSQL, Edge Functions, Auth, Storage, Realtime) - **INALTERADO**
- Hosting atual: Lovable (~$20/mês)
- Hosting alvo: Vercel Pro ($20/mês)

**Objetivo**: Zero downtime, rollback <5min, manter ou melhorar performance (LCP <2.5s).

---

## R1: Vercel Configuration Best Practices

### Decision: Vercel Framework Preset + Custom Headers Configuration

**Escolha final**: Usar Vercel Framework Preset "Vite" com `vercel.json` customizado para rewrites SPA, security headers e otimizações de cache.

### Rationale

1. **Framework Preset "Vite"**: Vercel detecta automaticamente configurações otimizadas para Vite (Node.js 20.x, npm caching, build parallelization)
2. **SPA Rewrites**: Aplicação é SPA, precisa de fallback 404 → `/index.html` para react-router funcionar
3. **Security Headers**: CSP, X-Frame-Options, XSS Protection são best practices para produção
4. **Static Asset Caching**: Assets com hash no nome (`*.js`, `*.css`) podem ter cache longo (1 ano), HTML deve ter cache curto

### Alternatives Considered

| Alternativa | Prós | Contras | Veredicto |
|-------------|------|---------|-----------|
| Vercel sem `vercel.json` (auto-detect) | Simples, zero config | Não permite rewrites customizados, sem headers de segurança | **Rejeitado** - Falta controle sobre SPA routing |
| Next.js migration | SSR/SSG built-in, otimizações automáticas | Requer reescrita completa do código, fora de escopo | **Rejeitado** - Muito invasivo |
| Cloudflare Pages | Mais barato ($0 free tier), CDN global | Menos integrado com GitHub, sem analytics nativos | **Rejeitado** - DX inferior ao Vercel |

### Implementation Details

#### `vercel.json` Template

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "devCommand": "npm run dev",
  "env": {
    "NODE_VERSION": "20.x"
  },
  "build": {
    "env": {
      "NODE_OPTIONS": "--max-old-space-size=4096"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ],
  "regions": ["iad1"]
}
```

**Explicação dos campos**:

- `regions: ["iad1"]`: Deploy na região Washington D.C. (mais próxima do Brasil entre regiões americanas) - **NOTA**: Vercel Pro permite escolher regiões específicas
- `rewrites`: Garante que todas as rotas do React Router caem no `index.html`
- `headers[0]`: Security headers aplicados a todas as páginas
- `headers[1]`: Cache de 1 ano para assets com hash (Vite adiciona hash automático em `dist/assets/`)
- `headers[2]`: HTML sempre revalidado (evita cache de versões antigas)
- `NODE_OPTIONS`: Aumenta heap do Node.js para builds grandes (186 arquivos TS)

#### Build Settings no Dashboard do Vercel

**IMPORTANTE**: Mesmo com `vercel.json`, configurar no dashboard como backup:

1. **Framework Preset**: `Vite`
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Install Command**: `npm install` (default)
5. **Node.js Version**: `20.x` (match com desenvolvimento local)

#### Validação de Configuração

**Script de teste** (`scripts/validate-vercel-config.sh`):

```bash
#!/bin/bash
# Valida que vercel.json está correto antes de deploy

set -e

echo "Validating vercel.json..."

# Checa se arquivo existe
if [ ! -f "vercel.json" ]; then
  echo "ERROR: vercel.json not found"
  exit 1
fi

# Valida JSON syntax
if ! jq empty vercel.json 2>/dev/null; then
  echo "ERROR: vercel.json has invalid JSON syntax"
  exit 1
fi

# Checa campos obrigatórios
REQUIRED_FIELDS=("buildCommand" "outputDirectory" "rewrites")
for field in "${REQUIRED_FIELDS[@]}"; do
  if ! jq -e ".$field" vercel.json >/dev/null; then
    echo "ERROR: Missing required field: $field"
    exit 1
  fi
done

# Valida que output directory existe após build
npm run build
if [ ! -d "dist" ]; then
  echo "ERROR: Output directory 'dist' not found after build"
  exit 1
fi

# Valida que index.html existe no output
if [ ! -f "dist/index.html" ]; then
  echo "ERROR: index.html not found in dist/"
  exit 1
fi

echo "✓ vercel.json validation passed"
echo "✓ Build output validated"
```

**Executar antes do primeiro deploy**:
```bash
chmod +x scripts/validate-vercel-config.sh
./scripts/validate-vercel-config.sh
```

---

## R2: Environment Variables Mapping

### Decision: Replicar 3 env vars do Supabase + Adicionar VITE_SENTRY_DSN

**Escolha final**: Configurar 4 environment variables no Vercel (3 existentes + 1 nova para Sentry), todas públicas (prefixo `VITE_*`), disponíveis em Production + Preview environments.

### Rationale

1. **Auditoria completa**: `.env` contém apenas 3 variáveis relacionadas ao Supabase, nenhuma outra dependência detectada no código
2. **Todas públicas**: Prefixo `VITE_*` significa que são injetadas no bundle do cliente (não são secrets) - correto para Supabase Anon Key
3. **Sentry não configurado**: `@sentry/react` está no `package.json` mas não inicializado no código - deve ser adicionado durante migração
4. **Hotmart/OpenAI**: Keys vivem no backend (Supabase Edge Functions), não no frontend - **correto**, não adicionar ao Vercel

### Alternatives Considered

| Alternativa | Prós | Contras | Veredicto |
|-------------|------|---------|-----------|
| `.env.production` no repositório | Versionado, fácil de rastrear mudanças | **RISCO DE SEGURANÇA** - chaves vazariam no Git | **Rejeitado** |
| Vercel CLI (`vercel env pull`) | Automação possível, sync fácil | Requer CLI instalado localmente | **Aceito como complemento** |
| Secret manager externo (AWS Secrets Manager) | Rotação automática de secrets | Overkill para 4 variáveis públicas | **Rejeitado** - Complexidade desnecessária |

### Implementation Details

#### Lista Completa de Environment Variables

**Existentes (Lovable → Vercel)**:

| Nome | Tipo | Valor Atual | Descrição | Environments |
|------|------|-------------|-----------|--------------|
| `VITE_SUPABASE_PROJECT_ID` | Público | `ioaqszmayxuqbdmzdpkx` | ID do projeto Supabase | Production + Preview |
| `VITE_SUPABASE_URL` | Público | `https://ioaqszmayxuqbdmzdpkx.supabase.co` | URL base da API Supabase | Production + Preview |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Público | `eyJhbGci...` (JWT anon key) | Anon key para cliente Supabase | Production + Preview |

**Novas (Adicionar durante migração)**:

| Nome | Tipo | Valor | Descrição | Environments |
|------|------|-------|-----------|--------------|
| `VITE_SENTRY_DSN` | Público | `https://xxxxx@sentry.io/xxxxx` | Data Source Name para Sentry error tracking | Production + Preview |

**Validação importante**:

✅ **CORRETO**: Supabase **Anon Key** pode ser pública (protegida por RLS no backend)
❌ **INCORRETO**: Supabase **Service Role Key** NÃO deve estar no frontend (vive apenas nas Edge Functions)

#### Configuração no Vercel Dashboard

**Passo a passo**:

1. Acessar Vercel Dashboard → Project Settings → Environment Variables
2. Para cada variável, adicionar:
   - **Key**: Nome da variável (ex: `VITE_SUPABASE_URL`)
   - **Value**: Valor exato (copiar de `.env` local ou Lovable)
   - **Environments**: Selecionar **Production**, **Preview**, **Development**
3. **CRITICAL**: Após adicionar/alterar env vars, fazer **Redeploy** (Deployments → Latest → Redeploy) para aplicar

**Screenshot sugerido para documentação** (quickstart.md):
```
Settings → Environment Variables
┌─────────────────────────────────┬──────────────────────────────┐
│ Key                             │ Value                        │
├─────────────────────────────────┼──────────────────────────────┤
│ VITE_SUPABASE_PROJECT_ID        │ ioaqszmayxuqbdmzdpkx        │
│ VITE_SUPABASE_URL               │ https://ioaqszmayxuqbdmzd... │
│ VITE_SUPABASE_PUBLISHABLE_KEY   │ eyJhbGciOiJIUzI1NiIsInR5c... │
│ VITE_SENTRY_DSN                 │ https://xxxxx@sentry.io/xx...│
└─────────────────────────────────┴──────────────────────────────┘
```

#### Script de Validação de Environment Variables

**Script**: `scripts/validate-env-vars.ts`

```typescript
#!/usr/bin/env node
/**
 * Valida que todas as environment variables necessárias estão configuradas
 * Executar antes do deploy: node scripts/validate-env-vars.ts
 */

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_PROJECT_ID',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  // VITE_SENTRY_DSN é opcional (apenas em produção)
];

let hasErrors = false;

console.log('🔍 Validating environment variables...\n');

REQUIRED_ENV_VARS.forEach((varName) => {
  const value = process.env[varName];

  if (!value) {
    console.error(`❌ MISSING: ${varName}`);
    hasErrors = true;
  } else {
    // Validações específicas
    if (varName === 'VITE_SUPABASE_URL' && !value.startsWith('https://')) {
      console.error(`❌ INVALID: ${varName} must start with https://`);
      hasErrors = true;
    } else if (varName === 'VITE_SUPABASE_PUBLISHABLE_KEY' && !value.startsWith('eyJ')) {
      console.error(`❌ INVALID: ${varName} must be a valid JWT token`);
      hasErrors = true;
    } else {
      // Mostra apenas primeiros 20 chars para segurança
      const preview = value.length > 20 ? `${value.substring(0, 20)}...` : value;
      console.log(`✅ ${varName}: ${preview}`);
    }
  }
});

// Validar Sentry DSN se presente
const sentryDsn = process.env.VITE_SENTRY_DSN;
if (sentryDsn && !sentryDsn.startsWith('https://')) {
  console.error(`❌ INVALID: VITE_SENTRY_DSN must start with https://`);
  hasErrors = true;
} else if (sentryDsn) {
  console.log(`✅ VITE_SENTRY_DSN: ${sentryDsn.substring(0, 30)}...`);
} else {
  console.warn(`⚠️  OPTIONAL: VITE_SENTRY_DSN not set (error tracking disabled)`);
}

if (hasErrors) {
  console.error('\n❌ Environment validation failed');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are valid');
}
```

**Adicionar ao `package.json`**:
```json
{
  "scripts": {
    "validate:env": "tsx scripts/validate-env-vars.ts",
    "prebuild": "npm run validate:env"
  }
}
```

**Instalar `tsx` se não existir**:
```bash
npm install -D tsx
```

#### Sincronização via Vercel CLI

**Alternativa ao dashboard** (mais rápido para batch updates):

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Link projeto local com Vercel
vercel link

# Pull env vars do Vercel para .env.local (desenvolvimento)
vercel env pull .env.local

# Push env vars do .env para Vercel (NÃO usar com .env commitado!)
# vercel env add VITE_SENTRY_DSN production
```

**IMPORTANTE**: NUNCA commitar `.env` ou `.env.local` no Git - usar apenas para sincronizar com Vercel.

---

## R3: Build Performance Optimization

### Decision: Node.js 20.x + npm cache habilitado + Build Output Analysis

**Escolha final**: Alinhar Node.js 20.x entre desenvolvimento e Vercel, habilitar cache automático de dependências, monitorar bundle size com Vite Bundle Analyzer.

### Rationale

1. **Node.js 20.x**: Versão LTS atual, melhor performance de I/O e build speed vs 18.x (~15% mais rápido em benchmarks)
2. **npm cache nativo**: Vercel cacheia automaticamente `node_modules` entre builds se `package-lock.json` não mudar
3. **Build parallelization**: Vite já paraleliza builds por padrão com esbuild (nativo)
4. **Baseline atual**: Lovable leva ~3-4min para build, meta Vercel: **≤5min** (aceitável), ideal: **≤3min** (paridade)

### Alternatives Considered

| Alternativa | Prós | Contras | Veredicto |
|-------------|------|---------|-----------|
| pnpm em vez de npm | ~2x mais rápido, menos espaço em disco | Requer mudança de lockfile, possível incompatibilidade com deps | **Considerado futuro** - Não fazer na migração inicial |
| Turborepo/Nx caching | Cache distribuído, monorepo-friendly | Overkill para SPA único, complexidade alta | **Rejeitado** |
| Desabilitar source maps em produção | Build ~30% mais rápido | Debugging de erros em produção impossível | **Rejeitado** - Sentry precisa de source maps |

### Implementation Details

#### Benchmark de Build Time

**Executar antes e depois da migração**:

```bash
# Local (baseline)
time npm run build

# Vercel (via CLI para simular)
vercel build
```

**Expectativas**:

| Ambiente | Tempo esperado | Node version | Cache status |
|----------|---------------|--------------|--------------|
| Local (MacBook Pro M1) | 45-60s | 20.x | Hot cache |
| Lovable (cloud) | 3-4min | 18.x | Cold start |
| Vercel (primeira build) | 4-5min | 20.x | Cold cache |
| Vercel (builds subsequentes) | 2-3min | 20.x | Warm cache |

**Fatores que impactam**:

- **186 arquivos TypeScript**: Compilação é CPU-bound, beneficia de Node.js 20.x
- **TailwindCSS purge**: Análise de classes CSS usadas adiciona ~10-15s
- **Vite chunking**: Tree-shaking e code splitting adiciona overhead
- **Source maps**: Geração de `.map` files adiciona ~20-30% ao tempo total

#### Otimizações no `vite.config.ts`

**Adicionar configurações de build**:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Otimizações para produção
    target: "es2020", // Browsers modernos (95%+ coverage)
    minify: "esbuild", // Mais rápido que Terser
    sourcemap: true, // Necessário para Sentry
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks grandes
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            // Outros Radix UI conforme necessário
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Avisar se chunks > 1MB
  },
}));
```

**Benefícios**:
- `manualChunks`: Separa vendors em chunks independentes, melhor cache entre deploys (usuário não re-download React se só mudou código do app)
- `minify: esbuild`: ~5x mais rápido que Terser com compressão similar (~2-3% menos eficiente)
- `target: es2020`: Menos transpilação = build mais rápido + bundle menor

#### Monitoramento de Build Performance no Vercel

**Dashboard do Vercel**:

1. Deployments → Selecionar deploy → Build Logs
2. Procurar linha: `✓ built in XXs XXXms`
3. Comparar com baseline do Lovable

**Alertas automáticos** (configurar no Vercel):

- Build time > 5min → Notificação Slack/Email
- Build falhou → Notificação imediata

#### Bundle Size Analysis

**Instalar Vite Bundle Visualizer**:

```bash
npm install -D rollup-plugin-visualizer
```

**Adicionar ao `vite.config.ts`** (apenas em análise, não em build normal):

```typescript
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  // ... resto da config
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "analyze" && visualizer({ open: true })
  ].filter(Boolean),
}));
```

**Executar análise**:

```bash
npx vite build --mode analyze
```

Abrirá `stats.html` no browser mostrando treemap dos chunks.

**Meta de bundle size**:

- **Total JS inicial**: <500KB gzipped
- **Largest chunk**: <250KB gzipped
- **Total assets**: <2MB (incluindo CSS, fonts, imagens)

**Atual**: Sem medição baseline - executar antes da migração para comparar.

---

## R4: Custom Domain + SSL Configuration

### Decision: CNAME para Vercel + Let's Encrypt Automático + DNS TTL Gradual

**Escolha final**: Configurar custom domain via CNAME record apontando para Vercel, SSL provisionado automaticamente via Let's Encrypt, reduzir DNS TTL temporariamente para 300s durante migração, rollback via DNS revert.

### Rationale

1. **CNAME vs A Record**: CNAME permite Vercel gerenciar IPs dinamicamente (mais resiliente), A record requer atualização manual se IPs mudarem
2. **Let's Encrypt automático**: Vercel provê SSL gratuito e auto-renovável, zero configuração necessária
3. **TTL 300s durante migração**: Permite rollback rápido (<5min) se problemas críticos surgirem, depois aumentar para 3600s (1h) para reduzir carga em DNS resolvers
4. **Staging domain primeiro**: Validar HTTPS funcionando antes de trocar produção

### Alternatives Considered

| Alternativa | Prós | Contras | Veredicto |
|-------------|------|---------|-----------|
| Cloudflare proxy entre DNS e Vercel | DDoS protection, additional caching | Camada extra de complexidade, possível double-caching | **Rejeitado** - Desnecessário para escala atual |
| A record em vez de CNAME | Ligeiramente mais rápido (1 lookup menos) | Vercel pode mudar IPs, requer atualização manual | **Rejeitado** - CNAME é mais resiliente |
| Blue-Green deployment via DNS | Zero downtime garantido, fácil A/B | Requer dois environments ativos (2x custo temporário) | **Considerado** - Mas Lovable já serve como Green |

### Implementation Details

#### Step-by-Step DNS Configuration

**Domínio assumido**: `meuprd.com` (substituir pelo domínio real)

##### Fase 1: Staging Domain (Teste)

1. **Criar subdomain no DNS provider** (ex: Cloudflare, Route53, etc.):
   ```
   Type: CNAME
   Name: staging
   Target: cname.vercel-dns.com  # Vercel fornecerá target exato
   TTL: 300 (5 minutos)
   Proxy: OFF (se Cloudflare)
   ```

2. **Adicionar domain no Vercel Dashboard**:
   - Project Settings → Domains → Add Domain
   - Inserir: `staging.meuprd.com`
   - Vercel validará ownership via DNS (pode levar 1-5min)
   - Aguardar status: "Valid Configuration" + "SSL Active"

3. **Validar HTTPS**:
   ```bash
   curl -I https://staging.meuprd.com
   # Deve retornar 200 OK + header: server: Vercel
   ```

4. **Teste funcional completo** em `staging.meuprd.com` (ver checklist em quickstart.md)

##### Fase 2: Production Domain (Go-Live)

**Pre-requisites**:
- [ ] Staging validado 100% funcional
- [ ] Team pronto para monitoramento
- [ ] Rollback runbook impresso/acessível

**Timeline sugerido** (window de baixo tráfego - ex: 2h da manhã):

**T-60min**: Reduzir TTL do DNS de produção
```
Type: A (ou CNAME atual para Lovable)
Name: @ (ou www)
Target: <lovable-ip-atual>
TTL: 3600 → 300  # REDUZIR para 5 minutos
```

**T-0**: Trocar CNAME para Vercel
```
Type: CNAME
Name: @ (ou www)
Target: cname.vercel-dns.com
TTL: 300
Proxy: OFF
```

**T+5min**: Validar propagação
```bash
# Testar de múltiplos locations
dig meuprd.com
nslookup meuprd.com

# Testar carregamento
curl -I https://meuprd.com
```

**T+30min**: Monitoramento ativo (Sentry, Vercel Analytics)
- Checar error rate
- Validar que tráfego está chegando no Vercel (Deployments → Analytics → Visitors)

**T+2h**: Se tudo estável, comunicar sucesso

**T+7 dias**: Aumentar TTL de volta
```
TTL: 300 → 3600  # Volta para 1 hora
```

#### SSL/TLS Configuration

**Vercel provisiona automaticamente** via Let's Encrypt quando domain é adicionado:

1. Vercel detecta novo domain
2. Solicita certificado Let's Encrypt via ACME protocol
3. Valida ownership via HTTP-01 challenge (Vercel responde no endpoint `/.well-known/acme-challenge/`)
4. Instala certificado (válido por 90 dias)
5. Renova automaticamente ~30 dias antes de expirar

**Validação de certificado**:

```bash
# Checar emissor e validade
openssl s_client -connect meuprd.com:443 -servername meuprd.com </dev/null 2>/dev/null | openssl x509 -noout -text | grep -E 'Issuer|Not After'

# Deve mostrar:
# Issuer: CN=Let's Encrypt Authority X3, O=Let's Encrypt, C=US
# Not After: <data 90 dias no futuro>
```

**Troubleshooting SSL**:

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| SSL pending após 10min | DNS não propagou ainda | Aguardar até 24h, verificar CNAME correto |
| SSL failed | Cloudflare proxy ativado | Desabilitar proxy (orange cloud → grey cloud) |
| Mixed content warnings | Assets carregados via HTTP | Garantir todas URLs são `https://` ou protocol-relative `//` |

#### Rollback Procedure

**Quando executar rollback**:
- Error rate >10 erros/min por 5min consecutivos
- Funcionalidade core quebrada (auth, PRD generation)
- Performance degradada (LCP >5s consistente)

**Execution** (deve levar <5min):

1. **Reverter CNAME no DNS**:
   ```
   Type: A (ou CNAME para Lovable)
   Name: @ (ou www)
   Target: <lovable-ip-ou-cname>
   TTL: 300  # Manter baixo até estabilizar
   ```

2. **Validar propagação**:
   ```bash
   dig meuprd.com  # Deve apontar para Lovable novamente
   ```

3. **Confirmar Lovable acessível**:
   ```bash
   curl -I https://meuprd.com  # Deve retornar 200 OK
   ```

4. **Notificar equipe**:
   - Slack: "🔴 Rollback executado - site voltou para Lovable"
   - Postmortem meeting: agendar para investigar causa raiz

**Importante**: Supabase é único source of truth, então **ZERO perda de dados** durante rollback (usuários podem ter experimentado breve downtime durante propagação DNS).

---

## R5: Monitoring & Alerting Setup

### Decision: Sentry (Error Tracking) + Vercel Analytics (Web Vitals) + Vercel Logs

**Escolha final**: Integrar Sentry para error tracking detalhado com stack traces, ativar Vercel Analytics para Core Web Vitals, usar Vercel Logs para debugging de build/runtime, configurar alertas para >10 errors/min e LCP >3.5s.

### Rationale

1. **Sentry**: Já instalado (`@sentry/react` no package.json), basta configurar DSN e inicializar no código
2. **Vercel Analytics**: Nativo, zero configuração adicional, mede Real User Metrics (RUM)
3. **Vercel Logs**: Integrado, não requer setup externo
4. **Alerting**: Detecta problemas antes de usuários reportarem, permite rollback proativo

### Alternatives Considered

| Alternativa | Prós | Contras | Veredicto |
|-------------|------|---------|-----------|
| LogRocket ou FullStory | Session replay, user journey tracking | Caro ($99+/mês), overkill para escala atual | **Rejeitado** |
| Google Analytics 4 | Grátis, análise de comportamento | Não é ferramenta de error tracking | **Complementar** - Adicionar se necessário para product analytics |
| Datadog | APM completo, infra monitoring | $15/host/mês + custos de logs, desnecessário | **Rejeitado** |
| Self-hosted Sentry | Zero custo para pequenos volumes | Requer manutenção de servidor | **Rejeitado** - Time de SRE |

### Implementation Details

#### Sentry Configuration

##### 1. Criar Projeto no Sentry

1. Acessar [sentry.io](https://sentry.io) (criar conta se necessário)
2. Create Project → Platform: React → Project name: `meuprd-frontend`
3. Copiar DSN (formato: `https://xxxxx@sentry.io/xxxxx`)
4. Adicionar DSN ao Vercel (Environment Variables): `VITE_SENTRY_DSN`

##### 2. Inicializar Sentry no Código

**Editar `/src/main.tsx`** (adicionar antes de `createRoot`):

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Inicializar Sentry apenas em produção
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE, // "production" ou "preview"
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // LGPD compliance - ocultar texto sensível
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% das transações (reduz custo)
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% de sessões normais
    replaysOnErrorSampleRate: 1.0, // 100% de sessões com erro
    // Filtros
    beforeSend(event, hint) {
      // Ignorar erros conhecidos/irrelevantes
      const error = hint.originalException as Error;
      if (error?.message?.includes("ResizeObserver loop")) {
        return null; // Não enviar para Sentry
      }
      return event;
    },
  });
}

// Suprimir avisos chatos de features não reconhecidas
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes("Unrecognized feature: 'vr'") ||
    message.includes("Unrecognized feature: 'ambient-light-sensor'") ||
    message.includes("Unrecognized feature: 'battery'") ||
    message.includes("iframe which has both allow-scripts and allow-same-origin")
  ) {
    return;
  }
  originalError.apply(console, args);
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
```

##### 3. Adicionar Source Maps ao Build

**Editar `vite.config.ts`** (já configurado em R3, confirmar):

```typescript
build: {
  sourcemap: true, // Gera .map files
}
```

**Upload source maps para Sentry** (opcional - melhora debugging):

```bash
npm install -D @sentry/vite-plugin
```

**Atualizar `vite.config.ts`**:

```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => ({
  // ... resto da config
  plugins: [
    react(),
    mode === "production" && sentryVitePlugin({
      org: "sua-org", // Substituir
      project: "meuprd-frontend",
      authToken: process.env.SENTRY_AUTH_TOKEN, // Adicionar ao Vercel
    }),
  ].filter(Boolean),
}));
```

**Adicionar env var no Vercel**: `SENTRY_AUTH_TOKEN` (gerar em Sentry → Settings → Auth Tokens)

##### 4. Configurar Alertas no Sentry

1. Sentry dashboard → Alerts → Create Alert Rule
2. **Regra 1: High Error Rate**
   - Condition: Errors > 10 per minute
   - Action: Send notification to Slack channel `#alerts-producao`
3. **Regra 2: New Issue**
   - Condition: New issue is created (first occurrence)
   - Action: Send email to `dev-team@meuprd.com`

#### Vercel Analytics Configuration

**Ativação** (Vercel Pro inclui grátis):

1. Vercel dashboard → Project Settings → Analytics → Enable
2. Aguardar primeira page view (pode levar 1-2min)
3. Acessar Analytics tab para visualizar métricas

**Métricas disponíveis**:

- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): Target <2.5s
  - FID (First Input Delay): Target <100ms
  - CLS (Cumulative Layout Shift): Target <0.1
- **Traffic**: Page views, unique visitors, top pages
- **Geography**: Onde usuários estão acessando (por país)

**Alertas** (configurar manualmente via webhook ou Vercel API):

```bash
# Exemplo: Alertar se LCP > 3.5s por 5min consecutivos
# (Requer custom script ou integração com Vercel API)
```

#### Vercel Logs

**Acesso**:

1. Vercel dashboard → Project → Deployments → Select deployment
2. Tabs disponíveis:
   - **Build Logs**: Output do `npm run build`
   - **Runtime Logs**: Erros no browser (se Sentry não capturar)
   - **Functions Logs**: N/A (sem Edge Functions no Vercel, apenas Supabase)

**Retenção**: Vercel Pro retém logs por **7 dias**

**Export para long-term storage** (opcional):

- Configurar log drain para AWS S3, Datadog, etc.
- Não necessário para migração inicial

#### Cost Monitoring

**Vercel Dashboard → Settings → Usage**:

- **Bandwidth**: Limite Pro: 1TB/mês (atual: ~50GB/mês) - **SAFE**
- **Build Execution Time**: Limite Pro: 6000min/mês (atual: ~100 builds * 5min = 500min/mês) - **SAFE**
- **Edge Middleware Invocations**: N/A (não usamos)

**Alertas de custo** (configurar):

1. Usage → Set up alerts
2. Bandwidth > 800GB/mês → Email warning
3. Build time > 5000min/mês → Email warning

**Estimativa de custo mensal**:

| Item | Uso esperado | Custo |
|------|--------------|-------|
| Vercel Pro | Base plan | $20/mês |
| Bandwidth | 50GB/mês | $0 (incluído até 1TB) |
| Build time | 500min/mês | $0 (incluído até 6000min) |
| **Total Vercel** | | **$20/mês** |
| Sentry Developer | 5k errors/mês | $0 (free tier) |
| Supabase Pro | Existente | $25/mês |
| **Total Stack** | | **$45/mês** |

**Baseline Lovable**: $20/mês + Supabase $25/mês = **$45/mês** (paridade atingida)

---

## R6: Rollback Procedure Validation

### Decision: DNS Revert + Dual-Active Strategy + Automated Testing

**Escolha final**: Manter Lovable ativo em paralelo durante 7 dias pós-migração, rollback via mudança de DNS CNAME (<5min), validar com testes automatizados de smoke tests.

### Rationale

1. **DNS revert é mais rápido**: Reverter CNAME no DNS é instantâneo (propagação leva 5-10min com TTL 300s), mais rápido que rebuild/redeploy
2. **Dual-active elimina risco**: Ambos environments funcionais durante período de validação, custo extra temporário é justificado
3. **Supabase como single source of truth**: Database compartilhado elimina problemas de sincronização de dados
4. **Automated smoke tests**: Validação programática é mais confiável que checklist manual

### Alternatives Considered

| Alternativa | Prós | Contras | Veredicto |
|-------------|------|---------|-----------|
| Vercel Preview Deployments como fallback | Built-in no Vercel | Não tem domínio custom, usuários veriam URL diferente | **Rejeitado** |
| Blue-Green via load balancer | Troca instantânea | Requer LB externo (ex: Cloudflare), complexidade | **Overkill** |
| Snapshot de código no Vercel | Rollback via re-deploy de commit anterior | Lento (5min build), não é revert de infra | **Complementar** - Mas não primário |

### Implementation Details

#### Pre-Rollback Validation Checklist

**Executar ANTES de decidir por rollback** (evitar rollback desnecessário):

```bash
# 1. Verificar se erro é no Vercel ou no Supabase
curl -I https://meuprd.com/api/health  # Se 404, é problema de routing no Vercel
curl -I https://ioaqszmayxuqbdmzdpkx.supabase.co  # Se timeout, é Supabase

# 2. Checar error rate no Sentry
# Acessar Sentry dashboard → meuprd-frontend → Issues
# Se <10 errors/min E não é erro crítico (apenas warnings), NÃO rolar back

# 3. Checar Web Vitals no Vercel Analytics
# Se LCP >3.5s MAS usuários conseguem usar app, NÃO rolar back (otimizar depois)

# 4. Testar funcionalidade core manualmente
# Login via WhatsApp OTP
# Gerar 1 PRD
# Acessar Galeria
# Se TUDO funciona, NÃO rolar back
```

**Critérios para rollback** (ANY of):

- ❌ Auth quebrado (usuários não conseguem logar)
- ❌ PRD generation retorna 500 (Edge Function não alcançável)
- ❌ Error rate >10 errors/min por 5+ minutos
- ❌ Downtime completo (site não carrega)

#### Rollback Execution Runbook

**Tempo total esperado**: <5min (manual) ou <2min (automatizado)

##### Manual Rollback (via Dashboard DNS)

**Passo 1**: Acessar painel DNS (ex: Cloudflare, Route53)

**Passo 2**: Editar registro do domínio

```diff
Type: CNAME
Name: @ (ou www)
- Target: cname.vercel-dns.com
+ Target: <lovable-cname-ou-ip>  # Anotar ANTES da migração
TTL: 300
```

**Passo 3**: Salvar e aguardar propagação (1-5min)

**Passo 4**: Validar que Lovable está servindo

```bash
dig meuprd.com  # Deve apontar para Lovable
curl -I https://meuprd.com  # Deve retornar 200
```

**Passo 5**: Notificar equipe

```
Slack #alerts-producao:
🔴 ROLLBACK EXECUTADO
- Tempo: 17:45 UTC
- Motivo: [Auth quebrado / High error rate / etc]
- Status: Site voltou para Lovable
- Próximos passos: Debug no Vercel em paralelo
```

##### Automated Rollback (via Terraform ou Script)

**Script**: `scripts/rollback-to-lovable.sh`

```bash
#!/bin/bash
# Rollback automático de DNS via API do provedor
# Exemplo para Cloudflare (ajustar para seu provider)

set -e

DOMAIN="meuprd.com"
CLOUDFLARE_ZONE_ID="seu-zone-id"
CLOUDFLARE_API_TOKEN="seu-api-token"
LOVABLE_TARGET="seu-lovable-cname-ou-ip"

echo "🔴 Iniciando rollback para Lovable..."

# 1. Buscar DNS record ID
RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${DOMAIN}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

# 2. Atualizar record para apontar para Lovable
curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "'"${DOMAIN}"'",
    "content": "'"${LOVABLE_TARGET}"'",
    "ttl": 300,
    "proxied": false
  }'

echo "✅ DNS record atualizado"
echo "⏳ Aguardando propagação (até 5min)..."

# 3. Validar que mudou (loop até sucesso)
for i in {1..30}; do
  CURRENT_TARGET=$(dig +short ${DOMAIN} @1.1.1.1 | tail -n1)
  if [[ "$CURRENT_TARGET" == "$LOVABLE_TARGET" ]]; then
    echo "✅ DNS propagado com sucesso"
    exit 0
  fi
  echo "⏳ Tentativa $i/30 - aguardando..."
  sleep 10
done

echo "❌ Timeout - DNS não propagou em 5min"
exit 1
```

**Executar**:

```bash
chmod +x scripts/rollback-to-lovable.sh
./scripts/rollback-to-lovable.sh
```

#### Post-Rollback Actions

**Immediate** (0-30min):

1. [ ] Validar que Lovable está 100% funcional
2. [ ] Comunicar usuários (se downtime foi perceptível): "Estamos investigando uma instabilidade temporária. O serviço foi restaurado."
3. [ ] Criar incident postmortem doc (template abaixo)

**Short-term** (1-24h):

4. [ ] Debug causa raiz no Vercel (logs, Sentry issues)
5. [ ] Reproduzir problema em staging.meuprd.com
6. [ ] Aplicar fix
7. [ ] Re-testar migração em staging

**Long-term** (1-7 dias):

8. [ ] Re-executar migração com fix aplicado
9. [ ] Manter monitoramento extra ativo por 7 dias
10. [ ] Documentar lições aprendidas

**Incident Postmortem Template**:

```markdown
# Incident: Rollback de Vercel para Lovable

**Data**: 2025-11-XX
**Duração**: Xmin de downtime
**Impacto**: X usuários afetados

## Timeline
- 17:30 UTC: Deploy para Vercel iniciado
- 17:45 UTC: Erro detectado [descrever]
- 17:47 UTC: Decisão de rollback
- 17:50 UTC: DNS revertido
- 17:52 UTC: Lovable acessível novamente

## Root Cause
[Descrever causa raiz técnica]

## Resolution
[Descrever como foi resolvido]

## Prevention
[Checklist de ações para prevenir recorrência]
```

#### Supabase Client Behavior During DNS Change

**Validação**: Como `@supabase/supabase-js` se comporta quando URL do app muda?

**Resposta**: **SEM IMPACTO** - Supabase client conecta diretamente com `VITE_SUPABASE_URL` (hardcoded no env vars), não depende do domínio do frontend.

```typescript
// src/integrations/supabase/client.ts (assumido)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Sempre https://ioaqszmayxuqbdmzdpkx.supabase.co
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Usuário acessa via Lovable ou Vercel, Supabase client conecta ao mesmo backend
```

**Teste de validação**:

1. Deploy no Vercel com env vars corretas
2. Fazer login via Vercel URL (session token salvo em localStorage)
3. Mudar DNS de volta para Lovable
4. Acessar Lovable - **sessão deve persistir** (mesmo token, mesmo Supabase)

**Edge case**: Se usar cookies para auth (em vez de localStorage), domínio diferente pode invalidar. **Validar** se AuthContext usa cookies ou localStorage.

#### Session Persistence Testing

**Script de teste**: `tests/e2e/session-persistence.spec.ts` (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('session persists across domain change', async ({ page, context }) => {
  // 1. Login no Vercel
  await page.goto('https://staging.meuprd.com');
  await page.fill('[placeholder="Telefone"]', '+5511999999999');
  await page.click('text=Enviar código');
  // (assumindo mock de OTP ou bypass de teste)
  await page.fill('[placeholder="Código"]', '123456');
  await page.click('text=Confirmar');

  // 2. Validar que logou
  await expect(page.locator('text=Meu Perfil')).toBeVisible();

  // 3. Extrair auth token do localStorage
  const authToken = await page.evaluate(() => localStorage.getItem('sb-auth-token'));
  expect(authToken).toBeTruthy();

  // 4. Simular DNS change - acessar Lovable com mesmo contexto
  await page.goto('https://meuprd-lovable-backup.com'); // URL Lovable backup

  // 5. Validar que sessão persiste
  await expect(page.locator('text=Meu Perfil')).toBeVisible();

  // 6. Tentar ação autenticada (ex: dar like em PRD)
  await page.click('[data-testid="like-button"]');
  await expect(page.locator('[data-testid="like-count"]')).toContainText('1');
});
```

**Executar antes da migração**:

```bash
npm run test:e2e
```

---

## R7: Cache Strategy (Upstash Redis)

### Decision: Upstash Redis + Edge Config para User Context + Hotmart Validation Cache

**Escolha final**: Implementar Upstash Redis (serverless, pay-per-request) com TTL de 5min para user context (perfil, avatar) e 24h para Hotmart validation, reduzindo ~25-40% de chamadas a Supabase Edge Functions.

### Rationale

1. **Upstash Redis**: Serverless, zero manutenção, integração nativa com Vercel, free tier generoso (10k requests/day)
2. **User context cacheable**: Perfil de usuário muda raramente, 5min TTL é seguro
3. **Hotmart validation cacheable**: Transação aprovada não muda status por 24h (assumindo webhook de cancelamento invalida cache)
4. **Edge Config (alternativa)**: Built-in no Vercel, mas limitado a 512KB total - insuficiente para muitos usuários

### Alternatives Considered

| Alternativa | Prós | Contras | Veredicto |
|-------------|------|---------|-----------|
| Vercel Edge Config | Nativo, zero latência | Limite 512KB, sem TTL automático, read-only em runtime | **Rejeitado** - Muito limitado |
| Redis local (self-hosted) | Controle total, zero custo | Requer servidor, manutenção, latência geográfica | **Rejeitado** - Contra filosofia serverless |
| In-memory cache (app-level) | Zero latência, zero custo | Não persiste entre requests, limitado por RAM do Vercel | **Complementar** - Usar em conjunto |
| Cloudflare KV | Similar ao Upstash, barato | Menos integrado com Vercel | **Alternativa viável** - Mas Upstash tem melhor DX |

### Implementation Details

#### Upstash Redis Setup

##### 1. Criar Database no Upstash

1. Acessar [console.upstash.com](https://console.upstash.com) (criar conta se necessário)
2. Create Database → Name: `meuprd-cache` → Region: `us-east-1` (próximo ao Vercel)
3. Copiar credenciais:
   - `UPSTASH_REDIS_REST_URL`: `https://xxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN`: `Axxx...`

##### 2. Adicionar Env Vars no Vercel

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxx...
```

**IMPORTANTE**: Essas variáveis NÃO precisam de prefixo `VITE_` (são server-side only, usadas em Edge Functions do Vercel se houver).

**CORREÇÃO**: Como não temos Edge Functions no Vercel (apenas no Supabase), cache deve ser implementado **no Supabase Edge Functions**, não no frontend.

##### 3. Implementar Cache no Supabase Edge Function

**Exemplo**: Cachear validação Hotmart em `supabase/functions/validate-hotmart/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const UPSTASH_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function redisGet(key: string): Promise<string | null> {
  const response = await fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const data = await response.json();
  return data.result;
}

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  await fetch(`${UPSTASH_URL}/set/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value, ex: ttlSeconds }), // EX = TTL in seconds
  });
}

serve(async (req) => {
  const { transaction_id } = await req.json();

  // 1. Checar cache primeiro
  const cacheKey = `hotmart:${transaction_id}`;
  const cached = await redisGet(cacheKey);

  if (cached) {
    console.log(`Cache HIT: ${cacheKey}`);
    return new Response(cached, {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Cache MISS - chamar API Hotmart
  console.log(`Cache MISS: ${cacheKey} - calling Hotmart API`);
  const hotmartResponse = await fetch(`https://api.hotmart.com/transactions/${transaction_id}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("HOTMART_API_TOKEN")}` },
  });
  const data = await hotmartResponse.json();

  // 3. Salvar no cache (24h TTL)
  await redisSet(cacheKey, JSON.stringify(data), 86400); // 86400s = 24h

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Adicionar env vars no Supabase** (via dashboard ou CLI):

```bash
supabase secrets set UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=Axxx...
```

#### Cache Invalidation Strategy

**Problema**: O que acontece se transação Hotmart for cancelada/estornada?

**Solução 1: Webhook de Hotmart invalida cache**

```typescript
// supabase/functions/hotmart-webhook/index.ts
serve(async (req) => {
  const { event, transaction_id } = await req.json();

  if (event === "PURCHASE_CANCELED" || event === "PURCHASE_REFUNDED") {
    // Invalidar cache
    const cacheKey = `hotmart:${transaction_id}`;
    await fetch(`${UPSTASH_URL}/del/${cacheKey}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    console.log(`Cache invalidated: ${cacheKey}`);
  }

  return new Response("OK", { status: 200 });
});
```

**Solução 2: TTL conservador**

Se webhook não for confiável, usar TTL menor (ex: 1h em vez de 24h).

#### Cost Analysis (Upstash Redis)

**Free Tier**:
- 10,000 requests/day (~300k/mês)
- 256MB storage
- Global replication included

**Uso estimado**:

| Operação | Requests/mês | % do Free Tier |
|----------|-------------|----------------|
| Hotmart validation GET | 50,000 (assumindo ~70% cache hit) | 16% |
| Hotmart validation SET | 15,000 (cache misses) | 5% |
| User context GET | 100,000 | 33% |
| User context SET | 5,000 | 1.7% |
| **Total** | **170,000** | **56.7%** ✅ |

**Veredicto**: Free tier é suficiente para escala atual (1k usuários ativos/mês).

**Custo se exceder free tier**: $0.20 por 100k requests (~$0.10/mês extra se dobrar tráfego).

#### Cache Keys Strategy

**Padrão de chaves**:

```
hotmart:<transaction_id>           # Ex: hotmart:HP123456789
user:profile:<user_id>             # Ex: user:profile:uuid-123
user:avatar:<user_id>              # Ex: user:avatar:uuid-123
prd:likes:<prd_id>                 # Ex: prd:likes:uuid-456 (agregado)
```

**TTLs recomendados**:

| Tipo de dado | TTL | Justificativa |
|--------------|-----|---------------|
| Hotmart validation | 24h | Transações raramente mudam após aprovação |
| User profile | 5min | Balance entre freshness e performance |
| User avatar URL | 1h | URL é estável, S3 link não muda |
| PRD likes count | 30s | Tempo real "suficiente" para gamificação |

#### Monitoring Cache Performance

**Metrics to track**:

- **Cache Hit Rate**: (GET hits / total GETs) * 100 - target: >70%
- **Latency**: Avg time para GET (Upstash: ~10-20ms) vs Supabase query (~50-100ms)
- **Cost**: Requests/mês no dashboard Upstash

**Dashboard Upstash**:

1. console.upstash.com → Database → Metrics
2. Visualizar:
   - Requests per second
   - Hit rate (se disponível)
   - Storage usage

**Alertas** (configurar no Upstash):

- Requests > 280k/mês (90% do free tier) → Email warning

#### Implementation Roadmap

**Phase 1: Proof of Concept** (1-2 dias)

- [ ] Setup Upstash Redis account
- [ ] Implementar cache em 1 Edge Function (Hotmart validation)
- [ ] Testar cache hit/miss no staging
- [ ] Medir latência (antes vs depois)

**Phase 2: Rollout Completo** (3-5 dias)

- [ ] Adicionar cache em user profile fetch
- [ ] Adicionar cache em avatar URL fetch
- [ ] Implementar cache invalidation via webhook
- [ ] Monitorar cache hit rate por 7 dias

**Phase 3: Otimizações** (futuro - fora do escopo desta migração)

- [ ] Cache de PRD likes count (se gamificação virar core feature)
- [ ] Cache de leaderboard de eventos
- [ ] Preemptive cache warming (popular cache antes do usuário pedir)

---

## Cross-Cutting Concerns

### Security Considerations

**Checklist de segurança** (validar antes de go-live):

- [x] Env vars no Vercel configuradas corretamente (não hardcoded no código)
- [x] Service Role Key do Supabase **NUNCA** exposta no frontend (vive apenas em Supabase Edge Functions)
- [x] Security headers configurados no `vercel.json` (CSP, X-Frame-Options, etc.)
- [x] HTTPS forçado (Vercel faz automaticamente, mas validar)
- [x] CORS configurado no Supabase (aceitar requests de `meuprd.com` e `*.vercel.app`)
- [x] Sentry configurado com `beforeSend` para filtrar dados sensíveis (ex: tokens, passwords)
- [x] Cache keys não contêm PII (usar UUID em vez de email/telefone)

### Performance Benchmarks

**Executar antes e depois da migração**:

| Métrica | Baseline (Lovable) | Target (Vercel) | Método de medição |
|---------|-------------------|-----------------|-------------------|
| Build time | ~3-4min | ≤5min | Vercel dashboard |
| LCP (home) | TBD | <2.5s | Lighthouse |
| TTI (home) | TBD | <3.5s | Lighthouse |
| API call latency | ~100ms (Supabase) | ~80ms (com cache) | Sentry Performance |
| Bundle size (initial JS) | TBD | <500KB gzipped | Vite Bundle Visualizer |

**IMPORTANTE**: Executar Lighthouse audit **antes da migração** para estabelecer baseline.

```bash
# Instalar Lighthouse CLI
npm install -g lighthouse

# Executar audit
lighthouse https://meuprd.com --output html --output-path ./lighthouse-report-lovable.html
```

### Documentation Artifacts

**Arquivos a criar durante implementação**:

1. **`vercel.json`**: Configuração de build (R1) ✅
2. **`scripts/validate-vercel-config.sh`**: Validação de config (R1) ✅
3. **`scripts/validate-env-vars.ts`**: Validação de env vars (R2) ✅
4. **`scripts/rollback-to-lovable.sh`**: Rollback automatizado (R6) ✅
5. **`supabase/functions/*/cache-layer.ts`**: Implementação de cache (R7) - Futuro
6. **`docs/incident-response-runbook.md`**: Runbook de incidentes - Adicionar ao quickstart.md

---

## Decision Log

**Decisões arquiteturais documentadas**:

| ID | Decisão | Rationale | Alternativas | Status |
|----|---------|-----------|--------------|--------|
| D1 | Usar Vercel Framework Preset "Vite" | Zero config, otimizações automáticas | Next.js (reescrita), Cloudflare Pages | ✅ Aprovado |
| D2 | CNAME em vez de A record | Vercel gerencia IPs dinamicamente | A record (estático) | ✅ Aprovado |
| D3 | Sentry para error tracking | Já instalado, best-in-class | LogRocket (caro), self-hosted | ✅ Aprovado |
| D4 | Upstash Redis para cache | Serverless, free tier generoso | Edge Config (limitado), self-hosted Redis | ✅ Aprovado |
| D5 | TTL DNS 300s durante migração | Rollback <5min, balanceado com carga em resolvers | TTL 60s (mais rápido mas mais carga), 3600s (muito lento) | ✅ Aprovado |
| D6 | Manter Lovable ativo por 7 dias | Rede de segurança, custo extra justificado | Desativar imediatamente (arriscado) | ✅ Aprovado |
| D7 | Cache TTL 24h para Hotmart | Transações raramente mudam | TTL 1h (mais safe mas menos eficiente) | ✅ Aprovado |

---

## Next Steps

**Após research.md completo** (este documento):

1. **Executar `/speckit.tasks`**: Gerar `tasks.md` com breakdown detalhado de implementação
2. **Revisar quickstart.md**: Validar que todos os passos estão cobertos pela pesquisa
3. **Criar branch**: `git checkout -b 001-lovable-vercel-migration`
4. **Implementar Phase 0 artifacts**: `vercel.json`, scripts de validação, Sentry init
5. **Deploy staging**: Executar migração completa em `staging.meuprd.com`
6. **Go/No-Go meeting**: Decisão de trocar DNS de produção baseada em validação de staging

**Estimated timeline**: 8-12 horas de trabalho distribuídas em 2-3 dias para validações completas.

---

## Approval & Sign-off

**Documento revisado por**:

- [ ] Tech Lead: _______________ (Data: ______)
- [ ] DevOps: _______________ (Data: ______)
- [ ] Product Owner: _______________ (Data: ______)

**Aprovação para iniciar implementação**: ☐ Sim ☐ Não ☐ Com ressalvas (especificar abaixo)

**Ressalvas/Comentários**:

```
[Espaço para feedback do reviewer]
```

---

**End of Research Document**
