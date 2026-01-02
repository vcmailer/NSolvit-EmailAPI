export default {
  async fetch(request, env) {
    // 1. ALLOW ALL ORIGINS (Fixes the immediate blocking issue)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. Handle Preflight (Browser Safety Check)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // 3. Check for Environment Variables (Prevents invisible crashes)
      if (!env.MAILERSEND_API_KEY || !env.RECAPTCHA_SECRET_KEY) {
        throw new Error("Server Configuration Error: Missing API Keys in Cloudflare Settings");
      }

      // 4. Validate Request Method
      if (request.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      // 5. Parse Data
      let body;
      try {
        body = await request.json();
      } catch (e) {
        throw new Error("Invalid JSON data received");
      }

      const { firstName, lastName, email, subject, message, recaptchaToken } = body;

      if (!firstName || !lastName || !email || !subject || !message || !recaptchaToken) {
        throw new Error("All fields are required");
      }

      // 6. Verify Recaptcha
      const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error("reCAPTCHA verification failed");
      }

      // 7. Send Email
      const emailContent = {
        from: { email: "no-reply@nsolvit.com", name: "NSolvit Website" },
        to: [{ email: "vcmailerpro@gmail.com", name: "NSolvit Admin" }],
        subject: `New Lead: ${subject}`,
        html: `
          <h3>New Website Submission</h3>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr/>
          <p>${message}</p>
        `,
      };

      const mailRes = await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.MAILERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailContent),
      });

      if (!mailRes.ok) {
        const errText = await mailRes.text();
        throw new Error(`Email Provider Error: ${errText}`);
      }

      // 8. SUCCESS RESPONSE
      return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      // 9. ERROR RESPONSE (With CORS headers, so the browser can see the error)
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
