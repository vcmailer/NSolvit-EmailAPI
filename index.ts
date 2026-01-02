export default {
  fetch(request, env) {
    const var1 = env.MAILERSEND_API_KEY;
    const var2 = env.RECAPTCHA_SECRET_KEY;

    if (!var1 || !var2) {
      return new Response("Missing variables", { status: 500 });
    }

    return new Response(
      `Worker active\nMAILERSEND_API_KEY=${var1}\nRECAPTCHA_SECRET_KEY=${var2}`
    );
  }
};
