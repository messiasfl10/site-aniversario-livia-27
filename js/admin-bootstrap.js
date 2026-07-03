(function () {
  const ADMIN_LOGIN_PAGE = "admin-login.html";
  const PAGE_SCRIPTS = {
    "admin-dashboard.html": ["js/admin-home.js"],
    "admin-guests.html": [
      "js/admin-export.js",
      "js/admin-guests.js",
    ],
    "admin-rsvps.html": [
      "js/admin-export.js",
      "js/admin-rsvps.js",
    ],
  };

  function getCurrentPage() {
    return window.location.pathname.split("/").pop() || "admin-dashboard.html";
  }

  function redirectToAdminLogin(reason = "") {
    const params = new URLSearchParams({
      redirect: getCurrentPage(),
    });

    if (reason) {
      params.set("reason", reason);
    }

    window.location.replace(`${ADMIN_LOGIN_PAGE}?${params.toString()}`);
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const url = new URL(source, window.location.href);

      if (url.origin !== window.location.origin) {
        reject(new Error(`Script não permitido: ${source}`));
        return;
      }

      const script = document.createElement("script");
      script.src = url.href;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Falha ao carregar ${source}`));
      document.body.appendChild(script);
    });
  }

  async function startAdminPage() {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      redirectToAdminLogin();
      return;
    }

    const { data: isAdmin, error: adminError } =
      await supabaseClient.rpc("is_admin");

    if (adminError || isAdmin !== true) {
      await supabaseClient.auth.signOut();
      redirectToAdminLogin("unauthorized");
      return;
    }

    const scripts = PAGE_SCRIPTS[getCurrentPage()] || [];

    document.body.classList.remove("admin-auth-pending");

    for (const script of scripts) {
      await loadScript(script);
    }
  }

  startAdminPage().catch((error) => {
    console.error(error);
    redirectToAdminLogin("error");
  });
})();
