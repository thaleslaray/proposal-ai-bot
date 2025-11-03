# 🔧 Guia Técnico de Implementação - Funis de Marketing

> **Para:** Desenvolvedores  
> **Status:** Ready to Code  
> **Tempo Estimado:** 10-15 horas de desenvolvimento  
> **Complexidade:** Média

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Setup Inicial](#setup-inicial)
3. [Edge Functions](#edge-functions)
4. [Eventos de Analytics](#eventos-de-analytics)
5. [Pontos de Integração](#pontos-de-integração)
6. [Plataformas de Email](#plataformas-de-email)
7. [Banco de Dados](#banco-de-dados)
8. [Testes](#testes)
9. [Deploy](#deploy)
10. [Monitoring & Debugging](#monitoring--debugging)

---

## 🏗️ Visão Geral da Arquitetura

### Fluxo de Dados

```mermaid
graph TB
    A[User Action] --> B{Trigger Event?}
    B -->|Yes| C[trackEvent analytics.ts]
    C --> D[Edge Function: sync-email-platform]
    D --> E{Email Platform API}
    E -->|Loops.so| F[Create/Update Contact]
    E -->|Resend| G[Send Email]
    F --> H[Trigger Email Sequence]
    G --> H
    H --> I[Email Delivered]
    I --> J[User Opens Email]
    J --> K[User Clicks CTA]
    K --> L[Conversion Tracked]
    L --> M[Update User Role]
    M --> N[Analytics Dashboard]
```

### Componentes Principais

| Componente | Tecnologia | Responsabilidade |
|------------|-----------|------------------|
| **Frontend** | React + TypeScript | Trigger eventos, UI feedback |
| **Analytics** | Google Analytics + Custom | Track eventos do usuário |
| **Edge Functions** | Deno (Supabase) | Orquestrar envio de emails |
| **Email Platform** | Loops.so / Resend | Gestão de sequências de email |
| **Database** | PostgreSQL (Supabase) | Persistência de dados |
| **Admin Panel** | React | Dashboard de métricas |

---

## 🚀 Setup Inicial

### 1. Escolher Plataforma de Email

**Recomendação: Loops.so**

#### Por que Loops.so?
✅ Feito para SaaS (não para newsletters genéricas)  
✅ Free até 1000 contatos  
✅ Visual builder de sequências  
✅ API simples e documentada  
✅ Suporte excelente  

#### Alternativa: Resend
✅ Free até 3000 emails/mês  
✅ API minimalista  
✅ Boa para emails transacionais  
❌ Menos features de automação  

### 2. Criar Conta e Pegar API Key

**Loops.so:**
1. Acesse [loops.so](https://loops.so)
2. Crie conta gratuita
3. Vá em Settings → API Keys
4. Copie a API key

**Resend:**
1. Acesse [resend.com](https://resend.com)
2. Crie conta gratuita
3. Vá em API Keys
4. Crie nova key
5. Copie a key

### 3. Adicionar Secret no Supabase

```bash
# Via Lovable Cloud interface
Secret Name: LOOPS_API_KEY
Secret Value: [sua key aqui]

# OU (se usar Resend)
Secret Name: RESEND_API_KEY
Secret Value: [sua key aqui]
```

### 4. Verificar Domínio (Importante!)

**Para evitar cair em spam:**

1. Adicione seu domínio na plataforma de email
2. Configure registros DNS:
   - SPF: `v=spf1 include:loops.so ~all`
   - DKIM: (copiado da plataforma)
   - DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@seudominio.com`

3. Aguarde verificação (15min - 2h)

**Status esperado:** ✅ Verified

---

## 🔌 Edge Functions

### 1. `sync-email-platform/index.ts`

**Responsabilidade:**
- Receber eventos de triggers do frontend
- Sincronizar com plataforma de email (Loops/Resend)
- Criar/atualizar contatos
- Disparar sequências de email

**Código Completo:**

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncEmailRequest {
  event: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: 'free' | 'student' | 'lifetime' | 'admin';
    metadata?: {
      prd_count?: number;
      last_prd_at?: string;
      days_inactive?: number;
      [key: string]: any;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, user }: SyncEmailRequest = await req.json();
    
    console.log('📧 Sync Email Platform:', { event, user_id: user.id });

    // Validate required fields
    if (!event || !user || !user.email) {
      throw new Error('Missing required fields: event, user.email');
    }

    const loopsApiKey = Deno.env.get('LOOPS_API_KEY');
    if (!loopsApiKey) {
      throw new Error('LOOPS_API_KEY not configured');
    }

    // Map events to Loops.so events
    const eventMapping: Record<string, string> = {
      'daily_limit_reached': 'user_hit_limit',
      'upgrade_to_student': 'user_became_student',
      'upgrade_to_lifetime': 'user_became_lifetime',
      'first_prd_generated': 'user_first_prd',
      'user_inactive_7d': 'user_inactive_7',
      'user_inactive_14d': 'user_inactive_14',
      'user_inactive_21d': 'user_inactive_21',
      'secret_mode_activated': 'user_found_easter_egg',
      'user_signup_completed': 'user_signed_up',
    };

    const loopsEvent = eventMapping[event];
    if (!loopsEvent) {
      console.warn('⚠️ Event not mapped:', event);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Event not mapped' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or update contact in Loops
    const contactPayload = {
      email: user.email,
      firstName: user.name?.split(' ')[0] || 'Usuário',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      userGroup: user.role, // free, student, lifetime, admin
      userId: user.id,
      phone: user.phone || '',
      prdCount: user.metadata?.prd_count || 0,
      lastPrdAt: user.metadata?.last_prd_at || null,
      daysInactive: user.metadata?.days_inactive || 0,
    };

    // Upsert contact
    const contactResponse = await fetch('https://app.loops.so/api/v1/contacts/update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${loopsApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactPayload),
    });

    if (!contactResponse.ok) {
      const error = await contactResponse.text();
      console.error('❌ Loops API error:', error);
      throw new Error(`Loops API error: ${error}`);
    }

    console.log('✅ Contact upserted in Loops');

    // Send event to trigger email sequence
    const eventPayload = {
      email: user.email,
      eventName: loopsEvent,
      eventProperties: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        prdCount: user.metadata?.prd_count || 0,
        timestamp: new Date().toISOString(),
        ...user.metadata,
      },
    };

    const eventResponse = await fetch('https://app.loops.so/api/v1/events/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loopsApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!eventResponse.ok) {
      const error = await eventResponse.text();
      console.error('❌ Loops Event API error:', error);
      throw new Error(`Loops Event API error: ${error}`);
    }

    console.log('✅ Event sent to Loops:', loopsEvent);

    // Log to Supabase for analytics
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('email_events_log').insert({
      user_id: user.id,
      event_name: event,
      loops_event: loopsEvent,
      email: user.email,
      metadata: user.metadata,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ 
      success: true,
      event: loopsEvent,
      message: 'Email sequence triggered successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in sync-email-platform:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
```

**Arquivo:** `supabase/functions/sync-email-platform/index.ts`

---

### 2. `check-inactive-users/index.ts` (Cron Job)

**Responsabilidade:**
- Rodar diariamente (via cron)
- Identificar usuários inativos (7, 14, 21 dias)
- Disparar eventos de re-engagement

**Código Completo:**

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const handler = async (req: Request): Promise<Response> => {
  try {
    console.log('🔍 Checking for inactive users...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with their last PRD generation date
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        phone,
        user_roles!inner(role)
      `)
      .not('email', 'is', null);

    if (error) throw error;

    const now = new Date();
    const inactiveUsers = {
      day_7: [],
      day_14: [],
      day_21: [],
    };

    for (const user of users || []) {
      // Get user's last PRD
      const { data: lastPrd } = await supabase
        .from('api_usage')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastPrd) continue; // Never generated a PRD, skip

      const lastPrdDate = new Date(lastPrd.created_at);
      const daysSinceLastPrd = Math.floor((now.getTime() - lastPrdDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`User ${user.email}: ${daysSinceLastPrd} days inactive`);

      // Check if we already sent email for this milestone
      const { data: alreadySent } = await supabase
        .from('email_events_log')
        .select('id')
        .eq('user_id', user.id)
        .in('event_name', ['user_inactive_7d', 'user_inactive_14d', 'user_inactive_21d'])
        .gte('sent_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (alreadySent) {
        console.log(`Already sent re-engagement email to ${user.email} recently`);
        continue;
      }

      // Trigger appropriate re-engagement email
      if (daysSinceLastPrd >= 21) {
        inactiveUsers.day_21.push(user);
        await triggerReEngagement(user, 21, daysSinceLastPrd);
      } else if (daysSinceLastPrd >= 14) {
        inactiveUsers.day_14.push(user);
        await triggerReEngagement(user, 14, daysSinceLastPrd);
      } else if (daysSinceLastPrd >= 7) {
        inactiveUsers.day_7.push(user);
        await triggerReEngagement(user, 7, daysSinceLastPrd);
      }
    }

    console.log('✅ Inactive users check completed:', {
      day_7: inactiveUsers.day_7.length,
      day_14: inactiveUsers.day_14.length,
      day_21: inactiveUsers.day_21.length,
    });

    return new Response(JSON.stringify({ 
      success: true,
      inactive_users: inactiveUsers,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error checking inactive users:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

async function triggerReEngagement(user: any, milestone: number, actualDays: number) {
  const eventName = `user_inactive_${milestone}d`;
  
  console.log(`📧 Triggering ${eventName} for ${user.email}`);

  // Call sync-email-platform
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-email-platform`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: JSON.stringify({
      event: eventName,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.user_roles[0]?.role || 'free',
        metadata: {
          days_inactive: actualDays,
          milestone: milestone,
        },
      },
    }),
  });

  if (!response.ok) {
    console.error(`Failed to trigger ${eventName}:`, await response.text());
  } else {
    console.log(`✅ ${eventName} triggered for ${user.email}`);
  }
}

serve(handler);
```

**Arquivo:** `supabase/functions/check-inactive-users/index.ts`

**Configurar Cron (via Supabase Dashboard):**
```sql
-- Rodar diariamente às 10:00 AM UTC
SELECT cron.schedule(
  'check-inactive-users',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-inactive-users',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

---

## 📊 Eventos de Analytics

### Atualizar `src/utils/analytics.ts`

**Adicionar novos eventos:**

```typescript
/**
 * Google Analytics tracking utilities + Custom Email Events
 * Configure your GA4 Measurement ID in index.html
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Existing trackEvent function
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
    console.log('📊 Analytics:', eventName, params);
  }
};

// ... existing functions ...

// ==========================================
// NEW: Email Funnel Events
// ==========================================

export const FUNNEL_EVENTS = {
  // Conversão
  DAILY_LIMIT_REACHED: 'daily_limit_reached',
  UPGRADE_TO_STUDENT: 'upgrade_to_student',
  UPGRADE_TO_LIFETIME: 'upgrade_to_lifetime',
  
  // Engajamento
  FIRST_PRD_GENERATED: 'first_prd_generated',
  USER_INACTIVE_7D: 'user_inactive_7d',
  USER_INACTIVE_14D: 'user_inactive_14d',
  USER_INACTIVE_21D: 'user_inactive_21d',
  
  // Onboarding
  USER_SIGNUP_COMPLETED: 'user_signup_completed',
  
  // Easter Egg
  SECRET_MODE_ACTIVATED: 'secret_mode_activated',
  VOICE_MODE_USED: 'voice_mode_used',
};

/**
 * Track email funnel events + trigger email platform sync
 */
export const trackFunnelEvent = async (
  eventName: string, 
  userData: {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: 'free' | 'student' | 'lifetime' | 'admin';
  },
  metadata?: Record<string, any>
) => {
  // Track in GA
  trackEvent(eventName, {
    user_id: userData.id,
    user_role: userData.role,
    ...metadata,
  });

  // Trigger email platform sync (async, non-blocking)
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase.functions.invoke('sync-email-platform', {
      body: {
        event: eventName,
        user: {
          ...userData,
          metadata,
        },
      },
    });

    if (error) {
      console.error('❌ Failed to sync email platform:', error);
    } else {
      console.log('✅ Email platform synced:', eventName);
    }
  } catch (error) {
    console.error('❌ Error in trackFunnelEvent:', error);
  }
};
```

**Uso:**

```typescript
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/utils/analytics';

// Exemplo: Quando usuário atinge limite
await trackFunnelEvent(
  FUNNEL_EVENTS.DAILY_LIMIT_REACHED,
  {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: 'free',
  },
  {
    prd_count: documentCount,
    limit: 1,
  }
);
```

---

## 🔗 Pontos de Integração

### 1. `PRDGenerator.tsx` - Daily Limit Reached

**Local:** Linha ~130 (onde mostra modal de upgrade)

**Antes:**
```typescript
if (documentCount >= limit) {
  setShowUpgradeModal(true);
  return;
}
```

**Depois:**
```typescript
if (documentCount >= limit) {
  // ✅ NOVO: Track limite atingido + disparar email
  await trackFunnelEvent(
    FUNNEL_EVENTS.DAILY_LIMIT_REACHED,
    {
      id: user.id,
      email: user.email || '',
      name: user.name || 'Usuário',
      phone: user.phone || '',
      role: isStudent ? 'student' : (isLifetime ? 'lifetime' : 'free'),
    },
    {
      prd_count: documentCount,
      limit: limit,
      attempted_at: new Date().toISOString(),
    }
  );

  setShowUpgradeModal(true);
  return;
}
```

**Importar:**
```typescript
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/utils/analytics';
```

---

### 2. `PRDGenerator.tsx` - First PRD Generated

**Local:** Após sucesso na geração do PRD (linha ~200)

**Antes:**
```typescript
const { data, error } = await supabase.functions.invoke('generate-prd', {
  body: { userInput, useRealtimeModel },
});

if (error) throw error;

setGeneratedDocument(data.prd);
// ... resto do código
```

**Depois:**
```typescript
const { data, error } = await supabase.functions.invoke('generate-prd', {
  body: { userInput, useRealtimeModel },
});

if (error) throw error;

setGeneratedDocument(data.prd);

// ✅ NOVO: Check if this is first PRD
const { data: previousPrds, error: countError } = await supabase
  .from('api_usage')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id);

if (!countError && previousPrds?.length === 1) {
  // This was the first PRD!
  await trackFunnelEvent(
    FUNNEL_EVENTS.FIRST_PRD_GENERATED,
    {
      id: user.id,
      email: user.email || '',
      name: user.name || 'Usuário',
      phone: user.phone || '',
      role: isStudent ? 'student' : (isLifetime ? 'lifetime' : 'free'),
    },
    {
      generated_at: new Date().toISOString(),
      used_voice: useRealtimeModel,
    }
  );
}

// ... resto do código
```

---

### 3. `WhatsAppAuth.tsx` - User Signup Completed

**Local:** Após signup bem-sucedido (linha ~150)

**Antes:**
```typescript
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: tempEmail,
  password: tempPassword,
});

if (signInError) throw signInError;

toast({
  title: "Autenticado com sucesso!",
  description: "Bem-vindo ao MeuPRD",
});

onSuccess?.();
```

**Depois:**
```typescript
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: tempEmail,
  password: tempPassword,
});

if (signInError) throw signInError;

// ✅ NOVO: Track signup completado + disparar onboarding
await trackFunnelEvent(
  FUNNEL_EVENTS.USER_SIGNUP_COMPLETED,
  {
    id: data.user!.id,
    email: tempEmail,
    name: otpData.name || 'Usuário',
    phone: phoneNumber,
    role: 'free',
  },
  {
    signed_up_at: new Date().toISOString(),
    phone_verified: true,
  }
);

toast({
  title: "Autenticado com sucesso!",
  description: "Bem-vindo ao MeuPRD",
});

onSuccess?.();
```

---

### 4. `AuthContext.tsx` - Role Changes (Upgrade)

**Local:** Onde o role é atualizado (ex: após validação Hotmart)

**Adicionar em `AuthContext.tsx`:**

```typescript
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/utils/analytics';

// Dentro do useEffect que monitora mudanças de role
useEffect(() => {
  if (!user) return;

  const checkRoleChange = async () => {
    const { data: currentRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!currentRole) return;

    // Compare with previous role (stored in localStorage or state)
    const previousRole = localStorage.getItem(`previous_role_${user.id}`);

    if (previousRole && previousRole !== currentRole.role) {
      // Role changed! Track upgrade
      if (currentRole.role === 'student' && previousRole === 'free') {
        await trackFunnelEvent(
          FUNNEL_EVENTS.UPGRADE_TO_STUDENT,
          {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || 'Usuário',
            phone: user.phone || '',
            role: 'student',
          },
          {
            upgraded_at: new Date().toISOString(),
            previous_role: previousRole,
          }
        );
      } else if (currentRole.role === 'lifetime') {
        await trackFunnelEvent(
          FUNNEL_EVENTS.UPGRADE_TO_LIFETIME,
          {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || 'Usuário',
            phone: user.phone || '',
            role: 'lifetime',
          },
          {
            upgraded_at: new Date().toISOString(),
            previous_role: previousRole,
          }
        );
      }
    }

    // Update previous role
    localStorage.setItem(`previous_role_${user.id}`, currentRole.role);
  };

  checkRoleChange();
}, [user]);
```

---

### 5. Easter Egg - Secret Mode Activation

**Adicionar em `PRDGenerator.tsx`:**

**Novo código para detectar código secreto:**

```typescript
const SECRET_CODE = 'LOVABLE';

const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const value = e.target.value;
  setUserInput(value);

  // ✅ NOVO: Check for secret code
  if (value.toUpperCase().includes(SECRET_CODE) && !secretModeActivated) {
    setSecretModeActivated(true);
    
    // Show confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Show toast
    toast({
      title: "🥚 Easter Egg Encontrado!",
      description: "Voz desbloqueada por 24 horas! 🎤",
      duration: 5000,
    });

    // Track event + trigger email
    await trackFunnelEvent(
      FUNNEL_EVENTS.SECRET_MODE_ACTIVATED,
      {
        id: user.id,
        email: user.email || '',
        name: user.name || 'Usuário',
        phone: user.phone || '',
        role: isStudent ? 'student' : (isLifetime ? 'lifetime' : 'free'),
      },
      {
        discovered_at: new Date().toISOString(),
        code_used: SECRET_CODE,
      }
    );

    // Grant temporary voice access (store in localStorage with expiry)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('voice_trial_expires', expiresAt);
  }
};
```

**Instalar pacote de confetti:**
```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

**Importar:**
```typescript
import confetti from 'canvas-confetti';
```

---

## 📧 Plataformas de Email

### Loops.so - Configuração Completa

#### 1. Criar Conta
- Acesse [loops.so](https://loops.so)
- Signup gratuito (até 1000 contatos)

#### 2. Configurar Custom Fields

**Settings → Audience → Custom Fields:**

| Field Name | Type | Description |
|------------|------|-------------|
| `userId` | String | ID do usuário no Supabase |
| `userGroup` | String | Role: free, student, lifetime, admin |
| `phone` | String | Telefone do usuário |
| `prdCount` | Number | Total de PRDs gerados |
| `lastPrdAt` | Date | Data do último PRD |
| `daysInactive` | Number | Dias desde último PRD |

#### 3. Criar Eventos

**Settings → Events:**

| Event Name | Description |
|------------|-------------|
| `user_hit_limit` | Usuário atingiu limite diário |
| `user_became_student` | Upgrade para Student |
| `user_became_lifetime` | Upgrade para Lifetime |
| `user_first_prd` | Primeiro PRD gerado |
| `user_inactive_7` | 7 dias sem atividade |
| `user_inactive_14` | 14 dias sem atividade |
| `user_inactive_21` | 21 dias sem atividade |
| `user_found_easter_egg` | Easter egg descoberto |
| `user_signed_up` | Novo signup |

#### 4. Criar Sequências de Email

**Loops → Sequences → Create Sequence:**

**Sequência 1: Free → Student (triggered by `user_hit_limit`)**

| Email # | Subject | Delay | Template |
|---------|---------|-------|----------|
| 1 | 🚫 Ops! Você atingiu o limite de hoje | 0 min | [Ver em FUNIS_MARKETING.md] |
| 2 | 💡 Como João gerou 15 PRDs em 1 dia | 2 hours | [Ver em FUNIS_MARKETING.md] |
| 3 | ⏰ Última chance: 20 PRDs vs 1 PRD | 24 hours | [Ver em FUNIS_MARKETING.md] |
| 4 | 🚨 [EXPIRA EM 6H] Seu desconto vai embora | 72 hours | [Ver em FUNIS_MARKETING.md] |

**Configurações:**
- Stop sequence if: `userGroup changes to "student"`
- Unsubscribe link: Required (bottom of all emails)
- Send from: `contato@meuprd.com` (ou seu domínio)

**Repetir para as outras sequências:** Student → Lifetime, Re-engagement, Onboarding, Easter Egg

#### 5. Design de Emails

**Template HTML básico (responsivo):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #9b87f5;
    }
    .content {
      padding: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%);
      color: white !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .cta-button {
        display: block;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MeuPRD</h1>
  </div>
  
  <div class="content">
    <h2>🚫 Ops! Você atingiu o limite de hoje</h2>
    
    <p>Oi {{firstName}},</p>
    
    <p>Percebi que você acabou de tentar gerar outro PRD, mas... 😔</p>
    
    <p><strong>Você atingiu o limite de 1 PRD por dia do plano gratuito.</strong></p>
    
    <p>Mas tenho uma boa notícia! 🎉</p>
    
    <p>Com o <strong>Plano Student</strong>, você desbloqueia:</p>
    <ul>
      <li>✅ Até 20 PRDs por dia (20x mais!)</li>
      <li>✅ Geração por voz (muito mais rápido)</li>
      <li>✅ Histórico completo de documentos</li>
      <li>✅ Suporte prioritário</li>
    </ul>
    
    <p><strong>OFERTA EXCLUSIVA PARA VOCÊ:</strong><br>
    <del>R$ 97/mês</del> → <strong>R$ 77/mês</strong> (20% OFF)</p>
    
    <a href="https://pay.hotmart.com/YOUR_PRODUCT_ID?coupon=LIMIT20" class="cta-button">
      🚀 QUERO VIRAR STUDENT AGORA
    </a>
    
    <p><small>Essa oferta expira em 72 horas.</small></p>
    
    <p>Continue gerando PRDs incríveis,<br>
    Equipe MeuPRD</p>
    
    <p><small>P.S.: Essa é a mesma ferramenta que criou +500 documentos para nossos clientes. Você merece acesso total! 🔥</small></p>
  </div>
  
  <div class="footer">
    <p>MeuPRD - Transformando ideias em documentos profissionais</p>
    <p><a href="{{unsubscribeUrl}}">Cancelar inscrição</a></p>
  </div>
</body>
</html>
```

**Variables dinâmicas do Loops:**
- `{{firstName}}` - Nome do usuário
- `{{userGroup}}` - Role atual
- `{{prdCount}}` - Total de PRDs
- `{{unsubscribeUrl}}` - Link de unsub (obrigatório)

---

### Resend - Alternativa (Se Preferir)

**Diferenças:**
- Resend não tem visual builder (tudo via API)
- Melhor para emails transacionais pontuais
- Sequências precisam ser gerenciadas no código

**Código para Resend:**

```typescript
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Send single email
await resend.emails.send({
  from: 'MeuPRD <contato@meuprd.com>',
  to: [user.email],
  subject: '🚫 Ops! Você atingiu o limite de hoje',
  html: emailTemplateHtml,
  tags: [
    { name: 'campaign', value: 'free_to_student' },
    { name: 'user_role', value: user.role },
  ],
});
```

**Recomendação:** Use **Loops.so** para gestão de sequências. Use **Resend** apenas para emails pontuais/transacionais.

---

## 🗄️ Banco de Dados

### Nova Tabela: `email_events_log`

**Para tracking de emails enviados e debugging**

```sql
-- Migration: Create email_events_log table

CREATE TABLE public.email_events_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  loops_event TEXT,
  email TEXT NOT NULL,
  metadata JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_email_events_user ON public.email_events_log(user_id);
CREATE INDEX idx_email_events_name ON public.email_events_log(event_name);
CREATE INDEX idx_email_events_sent_at ON public.email_events_log(sent_at);

-- Enable RLS
ALTER TABLE public.email_events_log ENABLE ROW LEVEL SECURITY;

-- Admin can see all logs
CREATE POLICY "Admins can view all email logs"
  ON public.email_events_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can see their own logs
CREATE POLICY "Users can view their own email logs"
  ON public.email_events_log
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.email_events_log IS 'Log de emails enviados para funis de marketing';
```

**Arquivo:** `supabase/migrations/XXXXXX_create_email_events_log.sql`

---

### Query para Dashboard (Admin Panel)

**Ver métricas de funis:**

```typescript
// No Admin Panel, adicionar nova seção "Email Funnels"

const { data: emailStats } = await supabase
  .from('email_events_log')
  .select('event_name, sent_at, opened_at, clicked_at, converted_at')
  .order('sent_at', { ascending: false });

// Calcular métricas
const metrics = {
  total_sent: emailStats.length,
  total_opened: emailStats.filter(e => e.opened_at).length,
  total_clicked: emailStats.filter(e => e.clicked_at).length,
  total_converted: emailStats.filter(e => e.converted_at).length,
  
  open_rate: (emailStats.filter(e => e.opened_at).length / emailStats.length) * 100,
  click_rate: (emailStats.filter(e => e.clicked_at).length / emailStats.length) * 100,
  conversion_rate: (emailStats.filter(e => e.converted_at).length / emailStats.length) * 100,
};

// Por funil
const byFunnel = emailStats.reduce((acc, event) => {
  const funnel = event.event_name;
  if (!acc[funnel]) acc[funnel] = { sent: 0, opened: 0, clicked: 0, converted: 0 };
  
  acc[funnel].sent++;
  if (event.opened_at) acc[funnel].opened++;
  if (event.clicked_at) acc[funnel].clicked++;
  if (event.converted_at) acc[funnel].converted++;
  
  return acc;
}, {});
```

---

## 🧪 Testes

### 1. Teste de Edge Function

**Arquivo:** `supabase/functions/sync-email-platform/test.ts`

```typescript
// Test script (run locally with Deno)

const testPayload = {
  event: 'daily_limit_reached',
  user: {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'João Silva',
    phone: '+5511999999999',
    role: 'free',
    metadata: {
      prd_count: 1,
      limit: 1,
    },
  },
};

const response = await fetch('http://localhost:54321/functions/v1/sync-email-platform', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY',
  },
  body: JSON.stringify(testPayload),
});

const result = await response.json();
console.log('Test result:', result);
```

**Rodar:**
```bash
deno run --allow-net supabase/functions/sync-email-platform/test.ts
```

---

### 2. Teste de Integração Completa

**Checklist:**

- [ ] Criar conta de teste (free)
- [ ] Gerar 1 PRD (atingir limite)
- [ ] Verificar se email foi enviado (check Loops.so)
- [ ] Clicar em CTA do email
- [ ] Verificar tracking no Admin Panel
- [ ] Fazer upgrade para Student (via checkout ou manualmente)
- [ ] Verificar se sequência parou (stop on role change)
- [ ] Verificar log em `email_events_log`

---

### 3. Teste de Cron Job (Inactive Users)

```bash
# Trigger manualmente via curl
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-inactive-users \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Check logs
supabase functions logs check-inactive-users
```

---

## 🚀 Deploy

### Checklist Pré-Deploy

- [ ] ✅ Secrets configurados (LOOPS_API_KEY ou RESEND_API_KEY)
- [ ] ✅ Edge functions criadas e testadas localmente
- [ ] ✅ Migração de DB rodada (`email_events_log` criada)
- [ ] ✅ Emails criados no Loops.so
- [ ] ✅ Sequências configuradas
- [ ] ✅ Domínio verificado (SPF/DKIM)
- [ ] ✅ Eventos de analytics implementados
- [ ] ✅ Testes passando

### Deploy Step-by-Step

**1. Deploy Edge Functions:**
```bash
# Via Lovable (automático ao fazer push)
# OU manualmente:
supabase functions deploy sync-email-platform
supabase functions deploy check-inactive-users
```

**2. Deploy Database Migration:**
```bash
# Via Lovable Cloud UI ou CLI:
supabase db push
```

**3. Deploy Frontend:**
```bash
# Via Lovable (automático)
# Ou manualmente:
npm run build
```

**4. Configurar Cron:**
```sql
-- Via Supabase SQL Editor
SELECT cron.schedule(
  'check-inactive-users-daily',
  '0 10 * * *',  -- 10 AM UTC todos os dias
  $$
  SELECT net.http_post(
    url := 'https://ioaqszmayxuqbdmzdpkx.supabase.co/functions/v1/check-inactive-users',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

**5. Ativar Funis:**
```sql
-- Marcar sistema como ativo (opcional)
INSERT INTO public.system_config (key, value) VALUES ('email_funnels_active', 'true');
```

---

## 📊 Monitoring & Debugging

### 1. Dashboard de Métricas (Admin Panel)

**Adicionar nova seção em `src/pages/Admin.tsx`:**

```typescript
import { EmailFunnelMetrics } from '@/components/admin/EmailFunnelMetrics';

// ... dentro do componente Admin
<EmailFunnelMetrics />
```

**Novo componente:** `src/components/admin/EmailFunnelMetrics.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FunnelMetrics {
  funnel_name: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

export function EmailFunnelMetrics() {
  const [metrics, setMetrics] = useState<FunnelMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('email_events_log')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Calculate metrics per funnel
      const funnelMap = new Map<string, any>();

      data.forEach((event) => {
        const funnel = event.event_name;
        if (!funnelMap.has(funnel)) {
          funnelMap.set(funnel, {
            funnel_name: funnel,
            total_sent: 0,
            total_opened: 0,
            total_clicked: 0,
            total_converted: 0,
          });
        }

        const funnelData = funnelMap.get(funnel);
        funnelData.total_sent++;
        if (event.opened_at) funnelData.total_opened++;
        if (event.clicked_at) funnelData.total_clicked++;
        if (event.converted_at) funnelData.total_converted++;
      });

      const metricsArray = Array.from(funnelMap.values()).map((funnel) => ({
        ...funnel,
        open_rate: (funnel.total_opened / funnel.total_sent) * 100,
        click_rate: (funnel.total_clicked / funnel.total_sent) * 100,
        conversion_rate: (funnel.total_converted / funnel.total_sent) * 100,
      }));

      setMetrics(metricsArray);
    } catch (error) {
      console.error('Error loading funnel metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando métricas...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">📊 Métricas de Funis de Email</h2>

      {metrics.map((funnel) => (
        <Card key={funnel.funnel_name}>
          <CardHeader>
            <CardTitle>{funnel.funnel_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{funnel.total_sent}</p>
                <p className="text-sm text-muted-foreground">Enviados</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{funnel.total_opened}</p>
                <p className="text-sm text-muted-foreground">Abertos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{funnel.total_clicked}</p>
                <p className="text-sm text-muted-foreground">Clicados</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{funnel.total_converted}</p>
                <p className="text-sm text-muted-foreground">Convertidos</p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Open Rate</span>
                  <span className="text-sm font-bold">{funnel.open_rate.toFixed(1)}%</span>
                </div>
                <Progress value={funnel.open_rate} />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Click Rate</span>
                  <span className="text-sm font-bold">{funnel.click_rate.toFixed(1)}%</span>
                </div>
                <Progress value={funnel.click_rate} />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Conversion Rate</span>
                  <span className="text-sm font-bold">{funnel.conversion_rate.toFixed(1)}%</span>
                </div>
                <Progress value={funnel.conversion_rate} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### 2. Logs Estruturados

**Ver logs das edge functions:**

```bash
# Via CLI
supabase functions logs sync-email-platform --tail

# Ou via Lovable Cloud UI
# Backend → Functions → sync-email-platform → Logs
```

**Filtrar por erro:**
```bash
supabase functions logs sync-email-platform | grep "❌"
```

---

### 3. Alertas (Opcional)

**Integrar com Sentry (já configurado):**

```typescript
// Em sync-email-platform/index.ts
import * as Sentry from "https://deno.land/x/sentry/index.mjs";

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  environment: 'production',
});

// ... no catch de erro
} catch (error: any) {
  console.error('❌ Error in sync-email-platform:', error);
  
  Sentry.captureException(error, {
    tags: {
      function: 'sync-email-platform',
      event: req.event,
    },
  });
  
  return new Response(...);
}
```

---

## ✅ Checklist Final de Implementação

### Fase 1: Setup (2-3 horas)
- [ ] Criar conta no Loops.so
- [ ] Configurar domínio (DNS)
- [ ] Adicionar LOOPS_API_KEY nos secrets
- [ ] Criar custom fields no Loops
- [ ] Criar eventos no Loops

### Fase 2: Edge Functions (3-4 horas)
- [ ] Criar `sync-email-platform/index.ts`
- [ ] Criar `check-inactive-users/index.ts`
- [ ] Testar localmente (Deno)
- [ ] Deploy para produção
- [ ] Configurar cron job

### Fase 3: Frontend Integration (2-3 horas)
- [ ] Atualizar `src/utils/analytics.ts`
- [ ] Adicionar tracking em `PRDGenerator.tsx`
- [ ] Adicionar tracking em `WhatsAppAuth.tsx`
- [ ] Adicionar tracking em `AuthContext.tsx`
- [ ] Implementar Easter Egg + confetti
- [ ] Testar todos os triggers

### Fase 4: Email Creation (3-4 horas)
- [ ] Criar sequência Free → Student (4 emails)
- [ ] Criar sequência Student → Lifetime (3 emails)
- [ ] Criar sequência Re-engagement (3 emails)
- [ ] Criar sequência Onboarding (4 emails)
- [ ] Criar sequência Easter Egg (4 emails)
- [ ] Testar preview de todos os emails
- [ ] Configurar delays e stop conditions

### Fase 5: Banco de Dados (1 hora)
- [ ] Criar migração `email_events_log`
- [ ] Rodar migração
- [ ] Testar RLS policies
- [ ] Verificar indexes

### Fase 6: Admin Dashboard (2-3 horas)
- [ ] Criar `EmailFunnelMetrics.tsx`
- [ ] Integrar no Admin Panel
- [ ] Adicionar gráficos de conversão
- [ ] Testar responsividade

### Fase 7: Testing (2-3 horas)
- [ ] Teste E2E completo (signup → limit → email → upgrade)
- [ ] Teste de cada sequência individualmente
- [ ] Teste de cron job manual
- [ ] Teste de tracking de métricas
- [ ] Teste de responsividade dos emails (mobile)

### Fase 8: Deploy & Monitoring (1 hora)
- [ ] Deploy todas as mudanças
- [ ] Verificar logs (sem erros)
- [ ] Monitorar primeiras 24h
- [ ] Ajustar baseado em feedback inicial

**Total Estimado:** 15-20 horas de desenvolvimento

---

## 🎯 Próximos Passos

1. **Leia o documento companheiro:** `PRD/FUNIS_MARKETING.md`
2. **Escolha a plataforma:** Loops.so (recomendado)
3. **Comece pelo Funil 1:** Free → Student (maior impacto)
4. **Teste exaustivamente:** Antes de escalar para toda base
5. **Monitore métricas:** Ajuste baseado em dados reais
6. **Itere rapidamente:** A/B test subject lines e copy

---

## 💬 Suporte

**Dúvidas técnicas:**
- Loops.so: support@loops.so
- Supabase: https://supabase.com/docs
- Lovable Cloud: https://docs.lovable.dev

**Referências:**
- Loops API Docs: https://loops.so/docs/api
- Resend API Docs: https://resend.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

**Versão:** 1.0  
**Última atualização:** 2025-10-20  
**Status:** ✅ Ready to Implement  

**Boa codificação! 🚀**
