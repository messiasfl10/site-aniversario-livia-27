(function () {
  function setupNavbar() {
    const navbar = document.querySelector(".navbar");
    const mobileMenu = document.querySelector(".mobile-menu");
    const navLinks = document.querySelector(".nav-links");

    if (navbar) {
      window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 50);
      });
    }

    if (mobileMenu && navLinks) {
      mobileMenu.addEventListener("click", () => {
        navLinks.classList.toggle("active");
      });
    }
  }

  function setupLogout(buttonId = "logoutButton") {
    const logoutButton = document.getElementById(buttonId);

    if (!logoutButton) {
      return;
    }

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      await GuestAuth.logoutGuest();
      window.location.replace("index.html");
    });
  }

  function showGuestName(guest, elementId = "guestNameDisplay") {
    const guestNameDisplay = document.getElementById(elementId);

    if (guest && guestNameDisplay) {
      const greeting =
        guest.invite_type === "couple" ? "Bem-vindos" : "Bem-vindo(a)";

      guestNameDisplay.textContent = `${greeting}, ${guest.name}`;
    }
  }

  window.PublicCommon = {
    setupLogout,
    setupNavbar,
    showGuestName,
  };
})();
