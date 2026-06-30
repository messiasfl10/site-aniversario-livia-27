(function () {
  function isSecureMode() {
    return window.GuestAuth?.isSecureMode();
  }

  async function loadRSVP(guestId) {
    return supabaseClient
      .from("rsvps")
      .select("*")
      .eq("guest_id", guestId)
      .maybeSingle();
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

      return {
        data: data?.[0] || null,
        error,
      };
    }

    return existingRSVP
      ? supabaseClient
          .from("rsvps")
          .update(payload)
          .eq("id", existingRSVP.id)
          .select()
          .single()
      : supabaseClient.from("rsvps").insert([payload]).select().single();
  }

  async function markGuestConfirmed(guest) {
    if (isSecureMode()) {
      guest.confirmed = true;
      return { error: null };
    }

    const result = await supabaseClient
      .from("guests")
      .update({ confirmed: true })
      .eq("id", guest.id);

    if (!result.error) {
      guest.confirmed = true;
      saveSession(guest);
    }

    return result;
  }

  async function loadSettings() {
    return supabaseClient.from("settings").select("*").limit(1).maybeSingle();
  }

  async function loadGiftCatalog() {
    if (isSecureMode()) {
      const { data, error } = await supabaseClient.rpc("get_gift_catalog");

      return {
        data: (data || []).map((gift) => ({
          ...gift,
          contributions: gift.own_contributions || [],
          own_contributions: gift.own_contributions || [],
          quota_reserved_count: Number(gift.quota_reserved_count || 0),
          quota_confirmed_count: Number(gift.quota_confirmed_count || 0),
        })),
        error,
      };
    }

    const { data: gifts, error } = await supabaseClient
      .from("gifts")
      .select("*")
      .order("category");
    const { data: contributions, error: contributionsError } =
      await supabaseClient.from("gift_contributions").select("*");

    return {
      contributions: contributions || [],
      contributionsError,
      data: gifts || [],
      error,
    };
  }

  async function setGiftPurchaseMethod(giftId, method, details) {
    if (isSecureMode()) {
      return supabaseClient.rpc("set_gift_purchase_method", {
        purchase_details: details,
        purchase_method: method,
        target_gift_id: giftId,
      });
    }

    return supabaseClient
      .from("gifts")
      .update({
        selected_purchase_method: method,
        selected_purchase_details: details,
      })
      .eq("id", giftId)
      .eq("reserved_guest_id", window.currentGuest.id);
  }

  async function reserveGift(giftId, reservationData) {
    if (isSecureMode()) {
      const { data, error } = await supabaseClient.rpc("reserve_gift", {
        reservation_message: reservationData.message,
        target_gift_id: giftId,
      });

      return { data: data?.[0] || null, error };
    }

    return supabaseClient
      .from("gifts")
      .update({
        status: "Reservado",
        reserved_guest_id: window.currentGuest.id,
        reserved_name: reservationData.name,
        reservation_message: reservationData.message,
        reserved_at: new Date().toISOString(),
        payment_status: "Pendente",
        payment_reported_at: null,
      })
      .eq("id", giftId)
      .select()
      .single();
  }

  async function reserveGiftQuotas(giftId, reservationData, quantity) {
    if (isSecureMode()) {
      const { data, error } = await supabaseClient.rpc("reserve_gift_quotas", {
        contribution_message: reservationData.message,
        requested_quantity: quantity,
        target_gift_id: giftId,
      });

      return { data: data?.[0] || null, error };
    }

    return supabaseClient
      .from("gift_contributions")
      .insert([
        {
          gift_id: giftId,
          guest_id: window.currentGuest.id,
          contributor_name: reservationData.name,
          message: reservationData.message,
          quota_quantity: quantity,
          quota_value: reservationData.quotaValue,
          total_value: quantity * reservationData.quotaValue,
          payment_status: "Pendente",
          payment_method: "pix",
        },
      ])
      .select()
      .single();
  }

  async function reportGiftPayment(gift) {
    if (isSecureMode()) {
      return supabaseClient.rpc("report_gift_payment", {
        target_gift_id: gift.id,
      });
    }

    return supabaseClient
      .from("gifts")
      .update({
        payment_status: "Informado",
        payment_reported_at: new Date().toISOString(),
        selected_purchase_method: gift.selected_purchase_method || "pix",
        selected_purchase_details: gift.selected_purchase_details || null,
      })
      .eq("id", gift.id)
      .eq("reserved_guest_id", window.currentGuest.id);
  }

  async function reportContributionPayment(contributionId) {
    if (isSecureMode()) {
      return supabaseClient.rpc("report_gift_contribution_payment", {
        target_contribution_id: contributionId,
      });
    }

    return supabaseClient
      .from("gift_contributions")
      .update({
        payment_status: "Informado",
        payment_reported_at: new Date().toISOString(),
      })
      .eq("id", contributionId)
      .eq("guest_id", window.currentGuest.id);
  }

  window.GuestData = {
    loadGiftCatalog,
    loadRSVP,
    loadSettings,
    markGuestConfirmed,
    reportContributionPayment,
    reportGiftPayment,
    reserveGift,
    reserveGiftQuotas,
    saveRSVP,
    setGiftPurchaseMethod,
  };
})();
