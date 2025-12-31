export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

    let body;
    try { body = await request.json(); } 
    catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }

    const { firstName, lastName, email, subject, message, recaptchaToken } = body;

    if (!firstName || !lastName || !email || !subject || !message || !recaptchaToken) {
      return new Response(JSON.stringify({ error: 'All fields and reCAPTCHA are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // Verify reCAPTCHA
    const verifyRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) return new Response(JSON.stringify({ error: 'reCAPTCHA verification failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

    // Professional email template
    const emailContent = {
      from: { email: 'no-reply@nsolvit.com', name: 'NSolvit Website Form' },
      to: [{ email: 'vcmailerpro@gmail@gmail.com', name: 'NSolvit' }],
      subject: `New message: ${subject}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; margin:0; padding:0;">
            <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e2e2; border-radius: 8px; overflow: hidden;">
              <tr style="background-color: #f7f7f7;">
                <td style="padding: 20px; text-align: center; border-bottom: 1px solid #e2e2e2;">
                  <h2 style="margin: 0; color: #333;">New Contact Form Submission</h2>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px;">
                  <p><strong>From:</strong> ${firstName} ${lastName} (<a href="mailto:${email}" style="color: #1a73e8;">${email}</a>)</p>
                  <p><strong>Subject:</strong> ${subject}</p>
                  <p><strong>Message:</strong></p>
                  <p style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${message}</p>
                </td>
              </tr>
              <tr style="background-color: #f7f7f7;">
                <td style="padding: 15px; text-align: center; font-size: 12px; color: #777;">
                  This email was sent from your website contact form.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `${firstName} ${lastName} (${email})\n\nSubject: ${subject}\n\n${message}`
    };

    try {
      const mailRes = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MAILERSEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent)
      });

      const mailText = await mailRes.text();
      if (!mailRes.ok) {
        console.error('MailerSend API error:', mailText);
        return new Response(JSON.stringify({ error: 'MailerSend API error' }), { status: mailRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
  }
};
