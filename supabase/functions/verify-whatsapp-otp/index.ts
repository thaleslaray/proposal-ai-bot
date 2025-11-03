import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-event-slug',
};

/**
 * Gera username automático no formato "primeiro-ultimo" (URL-safe).
 * Remove acentos, espaços e caracteres especiais.
 */
function generateUsername(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return `usuario-${Date.now()}`;
  }
  
  const words = fullName.trim().split(/\s+/);
  const firstName = words[0].toLowerCase();
  const lastName = words.length > 1 ? words[words.length - 1].toLowerCase() : '';
  
  let username = lastName ? `${firstName}-${lastName}` : firstName;
  
  // Remover acentos e caracteres especiais
  username = username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 20);
  
  return username || `usuario-${Date.now()}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code, name, email, utmParams } = await req.json();
    
    console.log('🔐 Verifying OTP:', { phone, hasName: !!name, hasEmail: !!email, hasUTM: !!utmParams });
    
    // Manter formato E.164 com prefixo +
    const cleanPhone = phone.startsWith('+') 
      ? phone.trim() 
      : `+${phone.replace(/\D/g, '')}`;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar código OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (otpError || !otpData) {
      console.error('❌ Invalid or expired OTP');
      return new Response(
        JSON.stringify({ error: 'Código inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ OTP verified successfully');
    
    // Marcar OTP como verificado
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpData.id);
    
    // BUSCAR APENAS POR TELEFONE E.164 (chave primária)
    console.log('🔍 Buscando usuário por telefone E.164:', cleanPhone);
    
    const { data: userByPhone, error: queryError } = await supabase.rpc('get_user_by_phone', {
      search_phone: cleanPhone
    });
    
    if (queryError) {
      console.error('❌ Erro ao buscar usuário:', queryError);
    }
    
    let userId: string;
    let isNewUser = false;
    const consistentEmail = email || `${cleanPhone}@whatsapp.auth`;
    
    // RPC retorna array, não objeto único
    if (userByPhone && userByPhone.length > 0) {
      // USUÁRIO EXISTE - Atualizar dados (SOBREPOR email se fornecido)
      console.log('✅ Usuário encontrado por telefone, atualizando dados');
      
      const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserById(userByPhone[0].id);
      
      if (getUserError || !user) {
        console.error('❌ Erro ao buscar dados do usuário:', getUserError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar dados do usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = user.id;
      
      console.log('📝 Atualizando: email, nome e telefone');
      await supabase.auth.admin.updateUserById(userId, {
        phone: cleanPhone,
        phone_confirm: true,
        email: consistentEmail,
        email_confirm: true,
        user_metadata: {
          name: name || '',
          email: email || '',
        },
      });
    } else {
      console.log('✨ Creating new user');
      isNewUser = true;
      
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        phone: cleanPhone,
        phone_confirm: true,
        email: consistentEmail,
        email_confirm: true,
        user_metadata: {
          name: name || '',
          email: email || '',
        },
      });
      
      if (signUpError || !newUser.user) {
        console.error('❌ Signup error:', signUpError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = newUser.user.id;
      
      // ✅ GARANTIR que phone foi salvo em auth.users.phone
      const { data: verifyUser } = await supabase.auth.admin.getUserById(userId);
      
      if (!verifyUser?.user?.phone) {
        console.warn('⚠️ Phone não foi salvo em auth.users, forçando update...', {
          userId,
          phone: cleanPhone
        });
        
        await supabase.auth.admin.updateUserById(userId, {
          phone: cleanPhone,
          phone_confirm: true
        });
      }
    }
    
    // 🔐 UPSERT profile COM consentimento LGPD (SEMPRE executa para todos os usuários)
    console.log('📝 Criando/atualizando profile para usuário:', userId);
    
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    const profileData: any = {
      id: userId,
      name: name || '',
      email: email || null,
      phone: cleanPhone,
      updated_at: new Date().toISOString(),
      lgpd_consent_date: new Date().toISOString(),  // ✅ SEMPRE salvar consentimento
      lgpd_consent_version: 'v1.0'
    };

    if (!existingProfile?.username) {
      profileData.username = generateUsername(name || '');
      profileData.created_at = new Date().toISOString();
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      console.error('❌ Erro ao criar/atualizar perfil:', profileError);
    } else {
      console.log('✅ Perfil criado/atualizado com consentimento LGPD');
    }
    
    // 📊 SALVAR DADOS DE AQUISIÇÃO (apenas para novos usuários)
    if (isNewUser && utmParams) {
      console.log('📊 Salvando dados de aquisição UTM:', utmParams);
      
      const { error: acquisitionError } = await supabase
        .from('user_acquisition')
        .insert({
          user_id: userId,
          utm_source: utmParams.utm_source || null,
          utm_medium: utmParams.utm_medium || null,
          utm_campaign: utmParams.utm_campaign || null,
          utm_term: utmParams.utm_term || null,
          utm_content: utmParams.utm_content || null,
          ref_code: utmParams.ref_code || null,
          referrer: utmParams.referrer || null,
          landing_page: utmParams.landing_page || null,
        });
      
      if (acquisitionError) {
        console.error('⚠️ Erro ao salvar dados de aquisição (non-blocking):', acquisitionError);
      } else {
        console.log('✅ Dados de aquisição salvos com sucesso');
      }
      
      // 🎯 AÇÕES AUTOMÁTICAS baseadas em UTM
      // Exemplo: auto-adicionar a evento se utm_campaign corresponder
      if (utmParams.utm_campaign) {
        console.log('🔍 Verificando ações automáticas para campanha:', utmParams.utm_campaign);
        
        // Buscar evento ativo com slug correspondente à campanha
        const { data: eventData } = await supabase
          .from('events')
          .select('slug, name')
          .eq('slug', utmParams.utm_campaign)
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .lte('start_date', new Date().toISOString())
          .maybeSingle();
        
        if (eventData) {
          console.log('🎉 Auto-adicionando ao evento:', eventData.name);
          
          const { error: autoEventError } = await supabase
            .from('event_participants')
            .insert({
              event_slug: eventData.slug,
              user_id: userId
            });
          
          if (autoEventError && autoEventError.code !== '23505') {
            console.error('⚠️ Erro ao auto-adicionar ao evento:', autoEventError);
          } else if (!autoEventError) {
            console.log('✅ Usuário auto-adicionado ao evento via UTM');
          }
        }
      }
    }
    
    // Gerar link de autenticação para obter o token hash
    console.log('🔑 Generating authentication link for user:', userId);
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email || `${cleanPhone}@whatsapp.auth`,
    });
    
    if (linkError || !linkData) {
      console.error('❌ Link generation error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar link de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar o token hash para obter a sessão
    console.log('🔓 Verifying token to create session');
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });
    
    if (sessionError || !sessionData?.session) {
      console.error('❌ Session creation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Session created successfully');
    
    // Validar acesso Hotmart automaticamente (não bloqueia login)
    if (email) {
      console.log('🔍 Validating Hotmart access for:', email);
      
      try {
        const { data: hotmartData, error: hotmartError } = await supabase.functions.invoke(
          'validate-hotmart-access',
          {
            body: { 
              user_id: userId,
              email: email 
            },
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`
            }
          }
        );
        
        if (hotmartError) {
          console.error('⚠️ Hotmart validation error (non-blocking):', hotmartError);
        } else {
          console.log('✅ Hotmart validation result:', hotmartData);
        }
      } catch (error) {
        console.error('⚠️ Hotmart validation failed (non-blocking):', error);
      }
    }

    // Detectar evento e registrar participante
    const eventSlug = req.headers.get('X-Event-Slug');
    console.log('🎯 Header X-Event-Slug recebido:', eventSlug);
    
    if (eventSlug) {
      console.log('🎉 Detectado evento:', eventSlug);
      try {
        const { error: eventError } = await supabase.from('event_participants').insert({
          event_slug: eventSlug,
          user_id: userId
        });
        
        if (eventError) {
          // Ignorar erro de duplicata (usuário já está no evento)
          if (eventError.code === '23505') {
            console.log('ℹ️ Usuário já registrado no evento');
          } else {
            console.error('❌ Erro ao registrar no evento:', eventError);
          }
        } else {
          console.log('✅ Usuário registrado no evento automaticamente');
        }
      } catch (eventError) {
        console.warn('⚠️ Erro ao registrar no evento (pode já estar registrado):', eventError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        message: isNewUser ? 'Conta criada com sucesso! Bem-vindo! 🎉' : 'Login realizado com sucesso!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error in verify-whatsapp-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao verificar código' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
