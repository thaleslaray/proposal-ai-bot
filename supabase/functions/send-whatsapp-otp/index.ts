import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, name, email } = await req.json();
    
    console.log('📞 Received request:', { phone, name, email });
    
    // Validar formato de telefone internacional (manter E.164 com +)
    const cleanPhone = phone.startsWith('+') 
      ? phone.trim() 
      : `+${phone.replace(/\D/g, '')}`;
    
    if (cleanPhone.length < 11) { // +XX mínimo
      return new Response(
        JSON.stringify({ error: 'Número de telefone inválido. Use formato internacional (+55...).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔢 Generated OTP code');
    
    // Salvar no banco com expiração de 10 minutos
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const { error: dbError } = await supabase
      .from('otp_codes')
      .insert({
        phone: cleanPhone,
        code,
        expires_at: expiresAt.toISOString()
      });
    
    if (dbError) {
      console.error('❌ Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar solicitação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ OTP saved to database');
    
    // Enviar WhatsApp via Meta Cloud API
    const metaAccessToken = Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    const templateName = Deno.env.get('META_WHATSAPP_TEMPLATE_NAME') || 'authentication_code';
    
    if (!metaAccessToken || !phoneNumberId) {
      console.error('❌ Meta credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Serviço de WhatsApp não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const metaUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    
    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'pt_BR'
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: code
                }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [
                {
                  type: 'text',
                  text: code
                }
              ]
            }
          ]
        }
      }),
    });
    
    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      console.error('❌ Meta API error:', metaResponse.status, errorText);
      
      let userMessage = 'Erro ao enviar WhatsApp. Tente novamente.';
      
      if (errorText.includes('template')) {
        userMessage = 'Template do WhatsApp não configurado. Contate o suporte.';
      } else if (errorText.includes('phone_number')) {
        userMessage = 'Número de WhatsApp inválido ou não registrado.';
      } else if (errorText.includes('rate limit')) {
        userMessage = 'Muitas tentativas. Aguarde alguns minutos.';
      }
      
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const metaData = await metaResponse.json();
    console.log('✅ WhatsApp sent successfully. Message ID:', metaData.messages?.[0]?.id);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Código enviado via WhatsApp!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error in send-whatsapp-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao enviar código' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
