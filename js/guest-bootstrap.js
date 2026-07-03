(function () {
  const PAGE_SCRIPTS = {
    "rsvp.html": ["js/rsvp.js"],
  };

  function getCurrentPage() {
    return window.location.pathname.split("/").pop();
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

  async function startGuestPage() {
    const guest = await GuestAuth.requireGuestPage();

    if (!guest) {
      return;
    }

    window.currentGuest = guest;
    document.body.classList.remove("guest-auth-pending");

    for (const script of PAGE_SCRIPTS[getCurrentPage()] || []) {
      await loadScript(script);
    }
  }

  startGuestPage().catch((error) => {
    console.error(error);
    window.location.replace("login.html");
  });
})();
