const form = document.getElementById("loginForm");
const errorDiv = document.getElementById("loginError");
const redirect = GuestAuth.getRedirectPage();

CaptchaProtection.initialize("guestCaptcha").catch((error) => {
  console.error(error);
  errorDiv.textContent =
    "Não foi possível carregar a validação de segurança. Atualize a página.";
});

GuestAuth.getGuest().then((guest) => {
  if (guest) {
    window.location.replace(`${redirect}.html`);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitButton = form.querySelector("button");
  const captchaMessage = CaptchaProtection.getValidationMessage();

  if (captchaMessage) {
    errorDiv.textContent = captchaMessage;
    return;
  }

  const inviteCode = document
    .getElementById("inviteCode")
    .value.trim()
    .toUpperCase();

  try {
    errorDiv.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    await GuestAuth.loginWithInviteCode(
      inviteCode,
      CaptchaProtection.getToken(),
    );
    window.location.replace(`${redirect}.html`);
  } catch (error) {
    console.error(error);
    const knownMessages = new Set([
      "Código inválido.",
      "Muitas tentativas. Aguarde alguns minutos.",
      "Sessão revogada.",
    ]);

    if (knownMessages.has(error?.message)) {
      errorDiv.textContent = error.message;
    } else if (/captcha/i.test(error?.message || "")) {
      errorDiv.textContent =
        "Não foi possível confirmar a validação de segurança. Tente novamente.";
    } else {
      errorDiv.textContent = "Não foi possível validar o convite.";
    }
  } finally {
    CaptchaProtection.reset();
    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});
