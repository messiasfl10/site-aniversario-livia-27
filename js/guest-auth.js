(function () {
  const isSecureMode = () => window.GuestAuthConfig?.mode === "supabase";

  function getRedirectPage() {
    const requestedPage = new URLSearchParams(window.location.search).get(
      "redirect",
    );

    return requestedPage === "rsvp" ? requestedPage : "index";
  }

  function getCurrentPage() {
    return window.location.pathname
      .split("/")
      .pop()
      .replace(".html", "");
  }

  async function getSecureGuest() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      return null;
    }

    const { data, error } = await supabaseClient.rpc(
      "get_current_guest_profile",
    );

    if (error) {
      console.error(error);
      return null;
    }

    return data?.[0] || null;
  }

  async function getGuest() {
    return isSecureMode() ? getSecureGuest() : getCurrentGuest();
  }

  async function requireGuestPage() {
    const guest = await getGuest();

    if (guest) {
      if (!isSecureMode()) {
        refreshSession();
      }

      return guest;
    }

    window.location.replace(`login.html?redirect=${getCurrentPage()}`);
    return null;
  }

  async function claimInvite(inviteCode, captchaToken = "") {
    let {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      const { data, error } = await supabaseClient.auth.signInAnonymously(
        captchaToken ? { options: { captchaToken } } : undefined,
      );

      if (error) {
        throw error;
      }

      session = data.session;
    }

    if (!session?.access_token) {
      throw new Error("Não foi possível criar a sessão do convite.");
    }

    const { data, error } = await supabaseClient.functions.invoke(
      "claim-invite",
      {
        body: { inviteCode },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );

    if (error) {
      let serverMessage = "";
      let requestId = "";
      let status = error.context?.status || 0;

      try {
        const responseBody = await error.context?.clone().json();
        serverMessage = responseBody?.error || "";
        requestId = responseBody?.requestId || "";
      } catch {
        serverMessage = "";
      }

      const claimError = new Error(
        serverMessage || "Não foi possível validar o convite.",
      );
      claimError.status = status;
      claimError.requestId = requestId;
      claimError.cause = error;
      throw claimError;
    }

    if (!data?.guest) {
      throw new Error("Não foi possível validar o convite.");
    }

    return data.guest;
  }

  async function loginWithInviteCode(inviteCode, captchaToken = "") {
    if (isSecureMode()) {
      const guest = await claimInvite(inviteCode, captchaToken);
      logout();
      return guest;
    }

    const { data, error } = await supabaseClient
      .from("guests")
      .select("*")
      .eq("invite_code", inviteCode)
      .eq("active", true)
      .single();

    if (error || !data) {
      throw new Error("Código inválido.");
    }

    const currentAccessCount = data.access_count || 0;

    await supabaseClient
      .from("guests")
      .update({
        access_count: currentAccessCount + 1,
        last_access: new Date().toISOString(),
      })
      .eq("id", data.id);

    saveSession(data);
    return data;
  }

  async function logoutGuest() {
    if (isSecureMode()) {
      await supabaseClient.auth.signOut();
    }

    logout();
  }

  window.GuestAuth = {
    getGuest,
    getRedirectPage,
    isSecureMode,
    loginWithInviteCode,
    logoutGuest,
    requireGuestPage,
  };
})();
