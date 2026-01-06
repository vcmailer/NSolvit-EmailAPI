export default {
  async fetch(request, env) {
    // 1. ALLOW ALL ORIGINS (Fixes the blocking issue)
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
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
      }

      // 3. PARSE DATA
      let body;
      try {
        body = await request.json();
      } catch (e) {
        throw new Error("Invalid JSON data");
      }

      const { firstName, lastName, email, subject, message, recaptchaToken } = body;

      // 4. CHECK VARIABLES
      if (!env.RECAPTCHA_SECRET_KEY) throw new Error("Missing RECAPTCHA_SECRET_KEY");
      if (!env.MAILERSEND_API_KEY) throw new Error("Missing MAILERSEND_API_KEY");

      // 5. VERIFY RECAPTCHA
      const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error("reCAPTCHA failed");

      // 6. SEND EMAIL
      const emailRes = await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.MAILERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { email: "no-reply@nsolvit.com", name: "NSolvit Form" },
          to: [{ email: "vcmailerpro@gmail.com", name: "Admin" }],
          subject: `New Lead: ${subject}`,
          // ADDITION 1: Plain text version (Required by some clients/filters)
          text: `New Contact\n\nName: ${firstName} ${lastName}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
          // ADDITION 2: Full HTML structure
          html: `
            <!DOCTYPE html>
            <html>
            <body>
              <h3>New Contact</h3>
              <p><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <hr/>
              <p>${message}</p>
            </body>
            </html>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        throw new Error(`Email Provider Error: ${errText}`);
      }

      // 7. SUCCESS
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      // 8. ERROR CATCHER (This is vital for debugging)
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
