(function () {
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

    nav.innerHTML = `
      <a class="admin-nav-brand" href="./admin-dashboard.html">
        <span>${celebrantName.charAt(0)}</span><div><strong>${celebrantName}</strong><small>${celebratedAge} anos</small></div>
      </a>
      <div class="admin-nav-label">Organização</div>
      ${items.map(([href, icon, label]) => `
        <a class="admin-nav-link ${page === href ? "active" : ""}" href="./${href}">
          <span class="admin-nav-icon">${icon}</span><span>${label}</span>
        </a>`).join("")}
      <a class="admin-nav-site-link" href="./index.html" target="_blank" rel="noopener noreferrer">↗ Ver site</a>
    `;

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
    formatDate,
    setText,
    setupLogout,
    showToast,
  };

  setupShell();
})();
