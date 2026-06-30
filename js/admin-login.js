(function () {
  const ADMIN_DEFAULT_PAGE = "admin-dashboard.html";
  const ADMIN_PAGES = new Set([
    "admin-dashboard.html",
    "admin-guests.html",
    "admin-rsvps.html",
    "admin-settings.html",
  ]);

  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("adminEmail");
  const passwordInput = document.getElementById("adminPassword");
  const submitButton = document.getElementById("adminLoginButton");
  const feedback = document.getElementById("loginError");
  const reason = new URLSearchParams(window.location.search).get("reason");

  function getRedirectPage() {
    const requestedPage = new URLSearchParams(window.location.search).get(
      "redirect",
    );

    return ADMIN_PAGES.has(requestedPage)
      ? requestedPage
      : ADMIN_DEFAULT_PAGE;
  }

  function setFeedback(message, type = "error") {
    feedback.textContent = message;
    feedback.classList.toggle("success", type === "success");
  }

  function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Entrando..." : "Entrar";
  }

  async function isCurrentUserAdmin() {
    const { data, error } = await supabaseClient.rpc("is_admin");

    return !error && data === true;
  }

  async function redirectExistingAdminSession() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session || !(await isCurrentUserAdmin())) {
      return;
    }

    window.location.replace(getRedirectPage());
  }

  if (reason === "unauthorized") {
    setFeedback("Sua sessão não possui acesso administrativo.");
  } else if (reason === "error") {
    setFeedback("Não foi possível validar sua sessão. Entre novamente.");
  }

  CaptchaProtection.initialize("adminCaptcha").catch((error) => {
    console.error(error);
    setFeedback(
      "Não foi possível carregar a validação de segurança. Atualize a página.",
    );
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    const captchaMessage = CaptchaProtection.getValidationMessage();

    if (captchaMessage) {
      setFeedback(captchaMessage);
      return;
    }

    const captchaToken = CaptchaProtection.getToken();
    setSubmitting(true);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      });

      if (error) {
        setFeedback(
          /captcha/i.test(error.message)
            ? "Não foi possível confirmar a validação de segurança. Tente novamente."
            : "E-mail ou senha inválidos.",
        );
        return;
      }

      if (!(await isCurrentUserAdmin())) {
        await supabaseClient.auth.signOut();
        setFeedback("Esta conta não possui acesso administrativo.");
        return;
      }

      setFeedback("Acesso confirmado.", "success");
      window.location.replace(getRedirectPage());
    } catch (error) {
      console.error(error);
      setFeedback("Não foi possível acessar o painel. Tente novamente.");
    } finally {
      CaptchaProtection.reset();
      setSubmitting(false);
    }
  });

  redirectExistingAdminSession().catch((error) => {
    console.error(error);
  });
})();
