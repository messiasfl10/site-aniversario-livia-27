(function () {
  const SCRIPT_ID = "cloudflare-turnstile-script";
  const SCRIPT_URL =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

  let widgetId = null;
  let token = "";
  let status = "disabled";

  function isEnabled() {
    return Boolean(
      window.CaptchaConfig?.enabled && window.CaptchaConfig?.siteKey,
    );
  }

  function loadTurnstile() {
    if (window.turnstile) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById(SCRIPT_ID);

      if (existingScript) {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Não foi possível carregar o CAPTCHA.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error("Não foi possível carregar o CAPTCHA.")),
        { once: true },
      );
      document.head.appendChild(script);
    });
  }

  async function initialize(containerId) {
    const container = document.getElementById(containerId);

    if (!container || !isEnabled()) {
      return;
    }

    container.hidden = false;
    status = "loading";

    try {
      await loadTurnstile();
      status = "pending";

      widgetId = window.turnstile.render(container, {
        sitekey: window.CaptchaConfig.siteKey,
        theme: "light",
        language: "pt-br",
        size: window.matchMedia("(max-width: 380px)").matches
          ? "compact"
          : "flexible",
        callback: (verifiedToken) => {
          token = verifiedToken;
          status = "verified";
        },
        "expired-callback": () => {
          token = "";
          status = "expired";
        },
        "error-callback": () => {
          token = "";
          status = "error";
        },
      });

    } catch (error) {
      status = "error";
      throw error;
    }
  }

  function getToken() {
    return token;
  }

  function getValidationMessage() {
    if (!isEnabled() || token) {
      return "";
    }

    return status === "error"
      ? "Não foi possível carregar a validação de segurança. Atualize a página."
      : "Conclua a validação de segurança para continuar.";
  }

  function reset() {
    token = "";

    if (widgetId !== null && window.turnstile) {
      window.turnstile.reset(widgetId);
      status = "pending";
    }
  }

  window.CaptchaProtection = {
    getToken,
    getValidationMessage,
    initialize,
    isEnabled,
    reset,
  };
})();
