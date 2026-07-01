(function () {
  const PAGE_SCRIPTS = {
    "rsvp.html": ["js/rsvp.js"],
  };

  function getCurrentPage() {
    return window.location.pathname.split("/").pop();
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
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
