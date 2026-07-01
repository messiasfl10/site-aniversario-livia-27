AdminCommon.setupLogout();

const setText = AdminCommon.setText;

function plannedPeople(guest) {
  const primary = guest.invite_type === "couple"
    ? Math.max((guest.couple_members || []).length, 2)
    : 1;
  return primary + Number(guest.max_guests || 0);
}

async function loadDashboard() {
  const [guestResult, rsvpResult, settingsResult] = await Promise.all([
    supabaseClient.from("guests").select("*").eq("active", true),
    supabaseClient.from("rsvps").select("*"),
    supabaseClient.from("settings").select("buffet_paying_age").limit(1).maybeSingle(),
  ]);

  const error = guestResult.error || rsvpResult.error || settingsResult.error;
  if (error) {
    console.error(error);
    AdminCommon.showToast("⚠️ Não foi possível carregar a visão geral.");
    return;
  }

  const guests = guestResult.data || [];
  const rsvps = (rsvpResult.data || []).filter((rsvp) => guests.some((guest) => guest.id === rsvp.guest_id));
  const rsvpByGuest = new Map(rsvps.map((rsvp) => [rsvp.guest_id, rsvp]));
  const yes = guests.filter((guest) => rsvpByGuest.get(guest.id)?.presence === "Sim").length;
  const no = guests.filter((guest) => rsvpByGuest.get(guest.id)?.presence === "Não").length;
  const pending = Math.max(guests.length - yes - no, 0);
  const responses = yes + no;
  const rate = guests.length ? Math.round((responses / guests.length) * 100) : 0;
  const capacity = guests.reduce((sum, guest) => sum + plannedPeople(guest), 0);
  const payingAge = settingsResult.data?.buffet_paying_age || BuffetMetrics.DEFAULT_PAYING_AGE;
  const attendance = BuffetMetrics.getAttendanceMetrics(guests, rsvps, payingAge);
  const companions = rsvps.reduce((sum, rsvp) => sum + (rsvp.presence === "Sim" ? (rsvp.guest_data?.companions || []).length : 0), 0);
  const occupancy = capacity ? Math.min(Math.round((attendance.totalPeople / capacity) * 100), 100) : 0;

  setText("activeInvites", guests.length);
  setText("confirmedPeople", attendance.totalPeople);
  setText("pendingInvites", pending);
  setText("declinedInvites", no);
  setText("yesInvites", yes);
  setText("noInvites", no);
  setText("pendingLegend", pending);
  setText("responseTotal", responses);
  setText("responseRateBadge", `${rate}% responderam`);
  setText("capacityConfirmed", attendance.totalPeople);
  setText("capacityTotal", capacity);
  setText("childrenCount", attendance.children);
  setText("payingCount", attendance.payingPeople);
  setText("companionsCount", companions);
  setText("invitePeopleHint", `${capacity} pessoas no limite planejado`);
  setText("payingPeopleHint", `${attendance.payingPeople} pagantes para o buffet`);
  setText("capacityCaption", occupancy ? `${occupancy}% da capacidade planejada já confirmada` : "Ainda não há presenças confirmadas");

  document.getElementById("capacityBar").style.width = `${occupancy}%`;
  const total = Math.max(guests.length, 1);
  const yesDeg = (yes / total) * 360;
  const noDeg = yesDeg + (no / total) * 360;
  document.getElementById("responseDonut").style.background = `conic-gradient(#9333ea 0deg ${yesDeg}deg, #f472b6 ${yesDeg}deg ${noDeg}deg, #f3e8ff ${noDeg}deg 360deg)`;
}

loadDashboard();
