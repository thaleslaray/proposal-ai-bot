import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendDocumentEmailRequest {
  document: string;
  userEmail: string;
  userName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 [send-document-email] Requisição recebida:', {
      method: req.method,
      hasBody: !!req.body,
      timestamp: new Date().toISOString()
    });

    const { document, userEmail, userName }: SendDocumentEmailRequest = await req.json();
    
    console.log('📦 Body recebido:', {
      hasDocument: !!document,
      documentLength: document?.length,
      userEmail: userEmail,
      userName: userName
    });

    if (!document || !userEmail) {
      console.error("❌ Missing required fields:", { hasDocument: !!document, hasEmail: !!userEmail });
      return new Response(
        JSON.stringify({ error: "Documento e e-mail são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📧 Sending document email to:", userEmail);

    // Convert markdown to basic HTML
    const htmlDocument = document
      .replace(/^## (.*$)/gim, '<h2 style="color: #1a1a1a; font-size: 24px; font-weight: bold; margin: 24px 0 12px 0;">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 style="color: #333; font-size: 20px; font-weight: bold; margin: 20px 0 10px 0;">$1</h3>')
      .replace(/^- (.*$)/gim, '<li style="margin: 4px 0;">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">')
      .replace(/\n/g, '<br/>');

    const greeting = userName ? `Olá, ${userName}!` : "Olá!";

    const emailResponse = await resend.emails.send({
      from: "Escola de Automação <noreply@mail.escoladeautomacao.com.br>",
      to: [userEmail],
      subject: "✨ Seu Documento está pronto!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">✨ Seu Documento está Pronto!</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">${greeting}</p>
                <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                  Seu documento foi gerado com sucesso! Abaixo você encontra todo o conteúdo detalhado:
                </p>
                
                <!-- Document Content -->
                <div style="background-color: #f9f9f9; border-left: 4px solid #667eea; padding: 20px; border-radius: 4px; margin: 30px 0;">
                  <div style="color: #333; font-size: 14px; line-height: 1.8;">
                    <p style="margin: 12px 0; line-height: 1.6;">${htmlDocument}</p>
                  </div>
                </div>
                
                <p style="font-size: 14px; color: #777; margin: 30px 0 0 0; line-height: 1.6;">
                  💡 <strong>Dica:</strong> Salve este e-mail para consultar seu documento sempre que precisar, ou compartilhe com sua equipe!
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                <p style="margin: 0; font-size: 14px; color: #999;">
                  Gerado automaticamente pelo seu Gerador de Documentos
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #bbb;">
                  © ${new Date().getFullYear()} Todos os direitos reservados
                </p>
              </div>
              
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("❌ Resend error:", emailResponse.error);
      throw emailResponse.error;
    }

    console.log("✅ Document email sent successfully. Message ID:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ [send-document-email] Erro crítico:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao enviar e-mail",
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
