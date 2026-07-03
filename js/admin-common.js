(function () {
  function appendTextElement(parent, tagName, text, className = "") {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function getSafeLocalUrl(path) {
    const url = new URL(path, window.location.href);

    if (url.origin !== window.location.origin) {
      return null;
    }

    return url.href;
  }

  function setSafeHref(anchor, path) {
    const href = getSafeLocalUrl(path);

    if (!href) {
      anchor.removeAttribute("href");
      return;
    }

    anchor.href = href;
  }

  function setupShell() {
    const nav = document.querySelector(".admin-nav");
    if (!nav) return;

    const page = window.location.pathname.split("/").pop() || "admin-dashboard.html";
    const eventConfig = window.EventConfig;
    const celebrantName = eventConfig?.celebrant.name || "Livia";
    const celebratedAge = eventConfig?.getCelebratedAge() || 27;
    const items = [
      ["admin-dashboard.html", "⌂", "Visão geral"],
      ["admin-guests.html", "♙", "Convidados"],
      ["admin-rsvps.html", "✓", "Confirmações"],
    ];

    nav.replaceChildren();

    const brand = document.createElement("a");
    brand.className = "admin-nav-brand";
    setSafeHref(brand, "./admin-dashboard.html");

    appendTextElement(brand, "span", celebrantName.charAt(0));

    const brandText = document.createElement("div");
    appendTextElement(brandText, "strong", celebrantName);
    appendTextElement(brandText, "small", `${celebratedAge} anos`);
    brand.appendChild(brandText);
    nav.appendChild(brand);

    appendTextElement(nav, "div", "Organização", "admin-nav-label");

    items.forEach(([href, icon, label]) => {
      const link = document.createElement("a");
      link.className = `admin-nav-link ${page === href ? "active" : ""}`.trim();
      setSafeHref(link, `./${href}`);
      appendTextElement(link, "span", icon, "admin-nav-icon");
      appendTextElement(link, "span", label);
      nav.appendChild(link);
    });

    const siteLink = document.createElement("a");
    siteLink.className = "admin-nav-site-link";
    siteLink.target = "_blank";
    siteLink.rel = "noopener noreferrer";
    setSafeHref(siteLink, "./index.html");
    siteLink.textContent = "↗ Ver site";
    nav.appendChild(siteLink);

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
      logoutButton.classList.add("admin-sidebar-logout");
      logoutButton.textContent = "↪ Sair do painel";
      nav.appendChild(logoutButton);
    }

    const toggle = document.createElement("button");
    const overlay = document.createElement("button");
    toggle.className = "admin-menu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Abrir menu administrativo");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "☰";
    overlay.className = "admin-menu-overlay";
    overlay.type = "button";
    overlay.setAttribute("aria-label", "Fechar menu administrativo");
    document.body.append(toggle, overlay);

    const setOpen = (open) => {
      document.body.classList.toggle("admin-menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu administrativo" : "Abrir menu administrativo");
      toggle.textContent = open ? "×" : "☰";
    };
    toggle.addEventListener("click", () => setOpen(!document.body.classList.contains("admin-menu-open")));
    overlay.addEventListener("click", () => setOpen(false));
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("admin-menu-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  function setupLogout(buttonId = "logoutButton") {
    const logoutButton = document.getElementById(buttonId);

    if (!logoutButton) {
      return;
    }

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;

      await supabaseClient.auth.signOut();
      window.location.replace("./index.html");
    });
  }

  function showToast(message, toastId = "adminToast") {
    const adminToast = document.getElementById(toastId);

    if (!adminToast) {
      return;
    }

    adminToast.textContent = message;
    adminToast.classList.add("show");

    setTimeout(() => {
      adminToast.classList.remove("show");
    }, 3500);
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString("pt-BR");
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  window.AdminCommon = {
    appendTextElement,
    formatDate,
    getSafeLocalUrl,
    setSafeHref,
    setText,
    setupLogout,
    showToast,
  };

  setupShell();
})();
