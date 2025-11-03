import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HOTMART_CLIENT_ID = Deno.env.get('HOTMART_CLIENT_ID')!;
const HOTMART_CLIENT_SECRET = Deno.env.get('HOTMART_CLIENT_SECRET')!;
const SUBSCRIPTION_PRODUCT_ID = 1355458;
const STUDENT_PRODUCT_IDS = [5036092, 1355458]; // Student: 3 PRDs/dia
const LIFETIME_PRODUCT_IDS = [4713431, 6398418]; // Lifetime: ilimitado
const ONE_TIME_PRODUCT_IDS = [...STUDENT_PRODUCT_IDS, ...LIFETIME_PRODUCT_IDS];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, force_revalidate } = await req.json();
    
    console.log('🔍 Validando acesso Hotmart para:', { user_id, email, force_revalidate });
    
    if (!email) {
      throw new Error('Email é obrigatório para validação');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Verificar cache válido (não expirado E success) - Skip if force_revalidate
    if (!force_revalidate) {
      const { data: cacheData } = await supabase
        .from('hotmart_validation_cache')
        .select('*')
        .eq('user_id', user_id)
        .gt('expires_at', new Date().toISOString())
        .eq('validation_status', 'success')
        .maybeSingle();
      
      if (cacheData) {
        console.log('✅ Cache válido encontrado, retornando resultado');
        
        // Determinar role baseado no produto
        let cachedRole: 'free' | 'student' | 'lifetime' = 'free';
        if (cacheData.has_access) {
          const productName = cacheData.product_name || '';
          if (LIFETIME_PRODUCT_IDS.some(id => productName.includes(String(id)))) {
            cachedRole = 'lifetime';
          } else {
            cachedRole = 'student';
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            hasAccess: cacheData.has_access || false,
            role: cachedRole,
            validationStatus: 'success',
            lastCheck: cacheData.last_check,
            expiresAt: cacheData.expires_at,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('🔄 Cache expirado ou inexistente, validando com Hotmart...');
    } else {
      console.log('⚡ Revalidação forçada - ignorando cache e consultando Hotmart diretamente');
    }
    
    // 2. Validar com Hotmart API
    let hasAccess = false;
    let userRole: 'free' | 'student' | 'lifetime' = 'free';
    let validationStatus = 'success';
    let errorMessage = '';
    let errorDetails: any = null;
    let cacheExpiry: Date;
    let productNames: string[] = [];
    
    try {
      // Timeout de 10 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Autenticar com Hotmart
      const basicAuth = btoa(`${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`);
      
      const authResponse = await fetch('https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!authResponse.ok) {
        throw new Error(`Hotmart auth failed: ${authResponse.status}`);
      }
      
      const authData = await authResponse.json();
      const accessToken = authData.access_token;
      
      console.log('✅ Autenticação Hotmart bem-sucedida');
      
      // Buscar assinaturas
      const subsController = new AbortController();
      const subsTimeoutId = setTimeout(() => subsController.abort(), 10000);
      
      const subsResponse = await fetch(
        `https://developers.hotmart.com/payments/api/v1/subscriptions?subscriber_email=${encodeURIComponent(email)}&max_results=500`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: subsController.signal,
        }
      );
      
      clearTimeout(subsTimeoutId);
      
      const subsData = await subsResponse.json();
      
      console.log('📦 Resposta Subscriptions:', {
        hasItems: !!subsData.items,
        itemsCount: subsData.items?.length || 0,
        sampleItem: subsData.items?.[0] || null
      });
      
      // Verificar assinaturas válidas
      const validSubscriptions = (subsData.items || []).filter((sub: any) => {
        // Validar estrutura antes de acessar
        if (!sub || !sub.product || !sub.status) {
          console.warn('⚠️ Subscription com estrutura inválida:', sub);
          return false;
        }
        return sub.product.id === SUBSCRIPTION_PRODUCT_ID && sub.status === 'ACTIVE';
      });
      
      console.log(`📊 Assinaturas ACTIVE encontradas: ${validSubscriptions.length}`);
      
      if (validSubscriptions.length > 0) {
        hasAccess = true;
        productNames = validSubscriptions.map((sub: any) => sub.product.name);
        userRole = 'student'; // Subscription sempre é student tier
      }
      
      // Buscar compras únicas
      const salesController = new AbortController();
      const salesTimeoutId = setTimeout(() => salesController.abort(), 10000);
      
      const salesResponse = await fetch(
        `https://developers.hotmart.com/payments/api/v1/sales/users?buyer_email=${encodeURIComponent(email)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: salesController.signal,
        }
      );
      
      clearTimeout(salesTimeoutId);
      
      const salesData = await salesResponse.json();
      
      console.log('📦 Resposta Sales:', {
        hasItems: !!salesData.items,
        itemsCount: salesData.items?.length || 0,
        sampleItem: salesData.items?.[0] || null
      });
      
      // Verificar compras válidas
      const validPurchases = (salesData.items || []).filter((sale: any) => {
        // Validar estrutura antes de acessar
        if (!sale || !sale.product || !sale.purchase || !sale.purchase.status) {
          console.warn('⚠️ Sale com estrutura inválida:', sale);
          return false;
        }
        return ONE_TIME_PRODUCT_IDS.includes(sale.product.id) && 
               sale.purchase.status === 'APPROVED';
      });
      
      console.log(`📊 Compras APPROVED encontradas: ${validPurchases.length}`);
      
      if (validPurchases.length > 0) {
        hasAccess = true;
        productNames.push(...validPurchases.map((sale: any) => sale.product.name));
        
        // Determinar tier baseado no produto (lifetime tem prioridade)
        const purchaseProductIds = validPurchases.map((p: any) => p.product.id);
        
        if (purchaseProductIds.some((id: number) => LIFETIME_PRODUCT_IDS.includes(id))) {
          userRole = 'lifetime';
        } else if (purchaseProductIds.some((id: number) => STUDENT_PRODUCT_IDS.includes(id))) {
          // Se já tinha student de subscription, mantém
          if (userRole !== 'student') {
            userRole = 'student';
          }
        }
      }
      
      // Cache por 12h em caso de sucesso
      cacheExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000);
      
    } catch (error: any) {
      console.error('❌ Erro ao validar Hotmart:', error);
      
      validationStatus = error.name === 'AbortError' ? 'timeout' : 'error';
      errorMessage = error.name === 'AbortError' 
        ? 'Timeout ao conectar com Hotmart API (10s)' 
        : `Erro ao validar com Hotmart: ${error.message}`;
      errorDetails = {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };
      
      // NOVA LÓGICA: Verificar último estado válido conhecido
      console.log('🔍 Buscando último estado válido do usuário...');
      
      const { data: lastValidCache } = await supabase
        .from('hotmart_validation_cache')
        .select('has_access, product_name, validation_status')
        .eq('user_id', user_id)
        .eq('validation_status', 'success')
        .order('last_check', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastValidCache && lastValidCache.has_access) {
        // Usuário tinha acesso válido anteriormente → manter temporariamente
        console.log('✅ Usuário tinha acesso válido anteriormente. Mantendo role por grace period.');
        hasAccess = true;
        
        // Determinar role baseado no produto anterior
        if (lastValidCache.product_name?.toLowerCase().includes('vitalicio') || 
            lastValidCache.product_name?.toLowerCase().includes('lifetime')) {
          userRole = 'lifetime';
        } else if (lastValidCache.product_name?.toLowerCase().includes('student') ||
                   lastValidCache.product_name?.toLowerCase().includes('aluno')) {
          userRole = 'student';
        } else {
          userRole = 'free'; // fallback seguro
        }
        
        validationStatus = 'error_with_grace_period';
        errorMessage = `${errorMessage} | Grace period: mantendo última role válida (${userRole})`;
        
      } else {
        // Usuário NUNCA teve acesso validado → FAIL CLOSED
        console.log('⚠️ Usuário nunca teve acesso válido. FAIL CLOSED para "free".');
        hasAccess = false;
        userRole = 'free'; // FAIL CLOSED
        validationStatus = 'error_no_previous_access';
        errorMessage = `${errorMessage} | Sem histórico de acesso válido`;
      }
      
      // Cache curto (5min) para permitir retry rápido
      cacheExpiry = new Date(Date.now() + 5 * 60 * 1000);
    }
    
    // 3. Atualizar role do usuário
    const targetRole = hasAccess ? userRole : 'free';
    
    console.log(`🎯 Definindo role: ${targetRole} (validationStatus: ${validationStatus})`);
    
    // Remover roles antigas (free/student/lifetime)
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user_id)
      .in('role', ['free', 'student', 'lifetime']);
    
    // Adicionar nova role
    await supabase
      .from('user_roles')
      .insert({
        user_id,
        role: targetRole,
      });
    
    // Atualizar email no perfil se fornecido
    if (user_id && email) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email })
        .eq('id', user_id);
      
      if (profileError) {
        console.warn('⚠️ Erro ao atualizar email no perfil:', profileError);
      } else {
        console.log('✅ Email atualizado no perfil do usuário');
      }
    }
    
    // 4. Salvar cache (sem email - já está no perfil)
    const now = new Date().toISOString();
    
    await supabase
      .from('hotmart_validation_cache')
      .upsert({
        user_id,
        phone: '',
        has_access: hasAccess,
        last_check: now,
        expires_at: cacheExpiry!.toISOString(),
        validation_status: validationStatus,
        error_message: errorMessage || null,
        error_details: errorDetails || null,
        product_name: productNames.length > 0 ? productNames.join(', ') : null,
      }, {
        onConflict: 'user_id',
      });
    
    console.log(`✅ Validação concluída: hasAccess=${hasAccess}, status=${validationStatus}`);
    
    // 5. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        hasAccess,
        role: targetRole,
        validationStatus,
        lastCheck: now,
        expiresAt: cacheExpiry!.toISOString(),
        errorMessage: errorMessage || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('❌ Erro crítico ao validar acesso:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao validar acesso',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
