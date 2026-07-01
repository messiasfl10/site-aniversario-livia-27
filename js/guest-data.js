(function () {
  function isSecureMode() {
    return window.GuestAuth?.isSecureMode();
  }

  async function loadRSVP(guestId) {
    return supabaseClient.from("rsvps").select("*").eq("guest_id", guestId).maybeSingle();
  }

  async function saveRSVP(existingRSVP, payload) {
    if (isSecureMode()) {
      const { data, error } = await supabaseClient.rpc("save_current_rsvp", {
        submitted_email: payload.email,
        submitted_food: payload.food,
        submitted_guest_data: payload.guest_data,
        submitted_message: payload.message,
        submitted_phone: payload.phone,
        submitted_presence: payload.presence,
      });
      return { data: data?.[0] || null, error };
    }
    return existingRSVP
      ? supabaseClient.from("rsvps").update(payload).eq("id", existingRSVP.id).select().single()
      : supabaseClient.from("rsvps").insert([payload]).select().single();
  }

  async function markGuestConfirmed(guest) {
    if (isSecureMode()) {
      guest.confirmed = true;
      return { error: null };
    }
    const result = await supabaseClient.from("guests").update({ confirmed: true }).eq("id", guest.id);
    if (!result.error) guest.confirmed = true;
    return result;
  }

  window.GuestData = { loadRSVP, markGuestConfirmed, saveRSVP };
})();
