(function () {
  async function loadRSVP(guestId) {
    return supabaseClient.from("rsvps").select("*").eq("guest_id", guestId).maybeSingle();
  }

  async function saveRSVP(existingRSVP, payload) {
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

  async function markGuestConfirmed(guest) {
    guest.confirmed = true;
    return { error: null };
  }

  window.GuestData = { loadRSVP, markGuestConfirmed, saveRSVP };
})();
