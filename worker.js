export default {
  async fetch(request, env) {
    // 1. LOGGING: This proves the new code is running
    console.log("DEBUG: Handling request method:", request.method);

    // 2. HEADERS: Allow everyone (*) to fix the blocking issue immediately
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 3. PREFLIGHT: Handle the browser check
    if (request.method === "OPTIONS") {
      console.log("DEBUG: Returning 204 for OPTIONS");
      return new Response(null, {
        status: 204, // The log MUST show 204, not 200
        headers: corsHeaders
      });
    }

    try {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
      }

      // 4. PARSE DATA
      const body = await request.json();
      const { firstName, lastName, email, subject, message, recaptchaToken } = body;

      if (!env.RECAPTCHA_SECRET_KEY) throw new Error("Missing RECAPTCHA_SECRET_KEY variable");
      if (!env.MAILERSEND_API_KEY) throw new Error("Missing MAILERSEND_API_KEY variable");

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
          subject: `New Contact: ${subject}`,
          text: `Name: ${firstName} ${lastName}\nEmail: ${email}\n\n${message}`,
        }),
      });

      if (!emailRes.ok) throw new Error(await emailRes.text());

      // 7. SUCCESS
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      console.error("DEBUG Error:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
