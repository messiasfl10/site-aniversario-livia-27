const SESSION_DURATION = 1000 * 60 * 60 * 24 * 7;

/* =========================
   Save Session
========================= */

function saveSession(guest) {
  const session = {
    guest,

    expiresAt: Date.now() + SESSION_DURATION,
  };

  localStorage.setItem("birthday_session", JSON.stringify(session));
}

/* =========================
   Get Session
========================= */

function getSession() {
  const raw = localStorage.getItem("birthday_session");

  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw);

    if (!session.expiresAt || Date.now() > session.expiresAt) {
      logout();

      return null;
    }

    return session;
  } catch {
    logout();

    return null;
  }
}

/* =========================
   Get Current Guest
========================= */

function getCurrentGuest() {
  const session = getSession();

  return session?.guest || null;
}

/* =========================
   Require Auth
========================= */

function requireAuth() {
  const guest = getCurrentGuest();

  if (!guest) {
    const currentPage = window.location.pathname
      .split("/")
      .pop()
      .replace(".html", "");

    window.location.href = `login.html?redirect=${currentPage}`;
  }
}

/* =========================
   Logout
========================= */

function logout() {
  localStorage.removeItem("birthday_session");
}

/* =========================
   Auto Refresh Session
========================= */

function refreshSession() {
  const guest = getCurrentGuest();

  if (!guest) {
    return;
  }

  saveSession(guest);
}
