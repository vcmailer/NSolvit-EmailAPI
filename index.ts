export default {
  fetch(request, env) {
    const var1 = env.MY_VAR_1;
    const var2 = env.MY_VAR_2;

    if (!var1 || !var2) {
      return new Response("Missing variables", { status: 500 });
    }

    return new Response(
      `Worker active\nMY_VAR_1=${var1}\nMY_VAR_2=${var2}`
    );
  }
};
