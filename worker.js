export default {
  async fetch(request, env) {
    // 1. Define CORS headers explicitly for your domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://nsolvit.com', // Explicit domain is safer than '*'
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 2. Handle the "Preflight" check immediately
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 3. Wrap EVERYTHING in a try/catch to ensure headers are always sent
    try {
      if (request.method !== 'POST') {
        throw new Error('Method Not Allowed');
      }

      let body;
      try {
        body = await request.json();
      } catch {
        throw new Error('Invalid JSON body');
      }

      const { firstName, lastName, email, subject, message, recaptchaToken } = body;

      if (!firstName || !lastName || !email || !subject || !message || !recaptchaToken) {
        throw new Error('All fields and reCAPTCHA are required');
      }

      // --- Verify reCAPTCHA ---
      const verifyRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyData.success) {
        throw new Error('reCAPTCHA verification failed');
      }

      // --- Prepare Email Content ---
      // FIXED TYPO: vcmailerpro@gmail@gmail.com -> vcmailerpro@gmail.com
      const emailContent = {
        from: { email: 'no-reply@nsolvit.com', name: 'NSolvit Website Form' },
        to: [{ email: 'vcmailerpro@gmail.com', name: 'NSolvit' }], 
        subject: `New message: ${subject}`,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
              <div style="background-color: #f7f7f7; padding: 20px; text-align: center;">
                <h2 style="margin: 0; color: #333;">New Contact Form Submission</h2>
              </div>
              <div style="padding: 20px;">
                <p><strong>From:</strong> ${firstName} ${lastName} (<a href="mailto:${email}">${email}</a>)</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px;">${message}</div>
              </div>
            </body>
          </html>
        `,
        text: `${firstName} ${lastName} (${email})\n\nSubject: ${subject}\n\n${message}`
      };

      // --- Send via MailerSend ---
      const mailRes = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MAILERSEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent)
      });

      if (!mailRes.ok) {
        const errorText = await mailRes.text();
        console.error('MailerSend Error:', errorText);
        throw new Error('Failed to send email via MailerSend provider');
      }

      // Success Response
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      // 4. GLOBAL ERROR CATCHER - Ensures CORS headers are present even on crash
      console.error('Worker Error:', err.message);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
