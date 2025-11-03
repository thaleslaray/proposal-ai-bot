import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Produto de assinatura recorrente (status: ACTIVE)
const SUBSCRIPTION_PRODUCT_ID = 1355458;

// Produtos de compra única (status: APPROVED)
const ONE_TIME_PRODUCT_IDS = [4713431, 6398418, 5036092];

// Todos os produtos válidos
const ALL_VALID_PRODUCT_IDS = [SUBSCRIPTION_PRODUCT_ID, ...ONE_TIME_PRODUCT_IDS];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json().catch(() => ({ email: null }));
    
    const clientId = Deno.env.get('HOTMART_CLIENT_ID');
    const clientSecret = Deno.env.get('HOTMART_CLIENT_SECRET');

    console.log('🔐 Iniciando teste de autenticação Hotmart...');
    console.log('📋 Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'NÃO ENCONTRADO');

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais Hotmart não configuradas. Verifique os secrets HOTMART_CLIENT_ID e HOTMART_CLIENT_SECRET.');
    }

    // Criar Basic Auth
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    console.log('🔑 Basic Auth criado:', `${basicAuth.substring(0, 20)}...`);

    // Tentar autenticar na API Hotmart
    console.log('📡 Chamando API Hotmart...');
    
    // Preparar body no formato application/x-www-form-urlencoded
    const formBody = new URLSearchParams({
      grant_type: 'client_credentials',
    });

    const authResponse = await fetch('https://api-sec-vlc.hotmart.com/security/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      console.error('❌ Erro na autenticação:', JSON.stringify(authData, null, 2));
      throw new Error(`Hotmart auth failed: ${authData.error_description || authData.error || authResponse.statusText}`);
    }

    console.log('✅ Autenticação bem-sucedida!');
    console.log('🎫 Token recebido:', authData.access_token ? `${authData.access_token.substring(0, 20)}...` : 'vazio');
    console.log('⏱️ Expira em:', authData.expires_in, 'segundos');

    // Se não foi fornecido email, retornar apenas resultado da autenticação
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '✅ Autenticação Hotmart bem-sucedida!',
          expires_in: authData.expires_in,
          token_type: authData.token_type,
          token_preview: authData.access_token ? `${authData.access_token.substring(0, 20)}...` : null
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar transações do usuário
    console.log(`📧 Buscando transações para: ${email}`);
    
    // 1. Buscar assinaturas recorrentes (ACTIVE)
    const subsResponse = await fetch(
      `https://developers.hotmart.com/payments/api/v1/subscriptions?subscriber_email=${encodeURIComponent(email)}&status=ACTIVE`,
      {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const subsData = await subsResponse.json();
    console.log('📦 Resposta Subscriptions:', JSON.stringify(subsData, null, 2));

    // 2. Buscar compras únicas (APPROVED)
    const salesResponse = await fetch(
      `https://developers.hotmart.com/payments/api/v1/sales/history?buyer_email=${encodeURIComponent(email)}&transaction_status=APPROVED`,
      {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const salesData = await salesResponse.json();
    console.log('📦 Resposta Sales:', JSON.stringify(salesData, null, 2));

    if (!subsResponse.ok && !salesResponse.ok) {
      throw new Error('Erro ao buscar transações na Hotmart');
    }

    const subscriptionItems = subsData.items || [];
    const salesItems = salesData.items || [];

    // Validar assinaturas recorrentes (status ACTIVE)
    const validSubscriptions = subscriptionItems.filter((sub: any) => {
      const productId = sub.product?.id;
      const isActive = sub.status === 'ACTIVE';
      const isSubscriptionProduct = productId === SUBSCRIPTION_PRODUCT_ID;
      
      if (isActive && isSubscriptionProduct) {
        console.log(`✅ Assinatura válida encontrada: Produto ${productId} - ${sub.product?.name} (${sub.status})`);
        return true;
      }
      
      return false;
    });

    // Validar compras únicas (status APPROVED)
    const validPurchases = salesItems.filter((sale: any) => {
      const productId = sale.product?.id;
      const isApproved = sale.purchase?.status === 'APPROVED';
      const isOneTimeProduct = ONE_TIME_PRODUCT_IDS.includes(productId);
      
      if (isApproved && isOneTimeProduct) {
        console.log(`✅ Compra válida encontrada: Produto ${productId} - ${sale.product?.name} (${sale.purchase?.status})`);
        return true;
      }
      
      return false;
    });

    const allValidTransactions = [...validSubscriptions, ...validPurchases];
    const hasAccess = allValidTransactions.length > 0;

    console.log(`📊 Total de assinaturas encontradas: ${subscriptionItems.length}`);
    console.log(`📊 Total de compras encontradas: ${salesItems.length}`);
    console.log(`✅ Assinaturas válidas (ACTIVE): ${validSubscriptions.length}`);
    console.log(`✅ Compras válidas (APPROVED): ${validPurchases.length}`);
    console.log(`🔑 Usuário tem acesso? ${hasAccess ? 'SIM' : 'NÃO'}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        hasAccess: hasAccess,
        message: hasAccess 
          ? `✅ Acesso liberado! Encontradas ${allValidTransactions.length} transação(ões) válida(s)`
          : `❌ Sem acesso. Nenhuma transação válida encontrada.`,
        email: email,
        summary: {
          totalSubscriptions: subscriptionItems.length,
          totalPurchases: salesItems.length,
          validSubscriptions: validSubscriptions.length,
          validPurchases: validPurchases.length
        },
        validTransactions: [
          ...validSubscriptions.map((s: any) => ({
            type: 'subscription',
            transactionId: s.subscription_id,
            productId: s.product?.id,
            productName: s.product?.name || 'Produto sem nome',
            status: s.status,
            subscriber: {
              name: s.subscriber?.name,
              email: s.subscriber?.email
            }
          })),
          ...validPurchases.map((s: any) => ({
            type: 'purchase',
            transactionId: s.purchase?.transaction,
            productId: s.product?.id,
            productName: s.product?.name || 'Produto sem nome',
            status: s.purchase?.status,
            buyer: {
              name: s.buyer?.name,
              email: s.buyer?.email
            }
          }))
        ],
        validProductIds: {
          subscription: SUBSCRIPTION_PRODUCT_ID,
          oneTime: ONE_TIME_PRODUCT_IDS
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        message: 'Erro ao autenticar na Hotmart. Verifique os logs para mais detalhes.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
