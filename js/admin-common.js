(function () {
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
})();
