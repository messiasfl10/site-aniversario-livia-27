AdminCommon.setupLogout();

const setText = AdminCommon.setText;

const eventConfig = window.EventConfig;
const adminEventDate = eventConfig.formatDate(eventConfig.celebration.date, { day: "numeric", month: "long" });
setText("adminEventSummary", `Aniversário da ${eventConfig.celebrant.name} · ${adminEventDate}`);

function plannedPeople(guest) {
  const primary = guest.invite_type === "couple"
    ? Math.max((guest.couple_members || []).length, 2)
    : 1;
  return primary + Number(guest.max_guests || 0);
}

async function loadDashboard() {
  const [guestResult, rsvpResult] = await Promise.all([
    supabaseClient.from("guests").select("*").eq("active", true),
    supabaseClient.from("rsvps").select("*"),
  ]);

  const error = guestResult.error || rsvpResult.error;
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
  const attendingRSVPs = rsvps.filter((rsvp) => rsvp.presence === "Sim");
  const totalPeople = attendingRSVPs.reduce((sum, rsvp) => {
    const guest = guests.find((item) => item.id === rsvp.guest_id);
    const members = guest?.invite_type === "couple"
      ? (rsvp.guest_data?.members || []).filter((member) => member.presence === "Sim").length
      : 1;
    return sum + members + (rsvp.guest_data?.companions || []).length;
  }, 0);
  const children = attendingRSVPs.reduce((sum, rsvp) =>
    sum + (rsvp.guest_data?.companions || []).filter((companion) => companion.is_child === "Sim").length, 0);
  const companions = rsvps.reduce((sum, rsvp) => sum + (rsvp.presence === "Sim" ? (rsvp.guest_data?.companions || []).length : 0), 0);
  const occupancy = capacity ? Math.min(Math.round((totalPeople / capacity) * 100), 100) : 0;

  setText("activeInvites", guests.length);
  setText("confirmedPeople", totalPeople);
  setText("pendingInvites", pending);
  setText("declinedInvites", no);
  setText("yesInvites", yes);
  setText("noInvites", no);
  setText("pendingLegend", pending);
  setText("responseTotal", responses);
  setText("responseRateBadge", `${rate}% responderam`);
  setText("capacityConfirmed", totalPeople);
  setText("capacityTotal", capacity);
  setText("childrenCount", children);
  setText("adultsCount", Math.max(totalPeople - children, 0));
  setText("companionsCount", companions);
  setText("invitePeopleHint", `${capacity} pessoas planejadas no total`);
  setText("confirmedPeopleHint", `${children} criança${children === 1 ? "" : "s"} confirmada${children === 1 ? "" : "s"}`);
  setText("capacityCaption", occupancy ? `${occupancy}% da capacidade planejada já confirmada` : "Ainda não há presenças confirmadas");

  document.getElementById("capacityBar").style.width = `${occupancy}%`;
  const total = Math.max(guests.length, 1);
  const yesDeg = (yes / total) * 360;
  const noDeg = yesDeg + (no / total) * 360;
  document.getElementById("responseDonut").style.background = `conic-gradient(#9333ea 0deg ${yesDeg}deg, #f472b6 ${yesDeg}deg ${noDeg}deg, #f3e8ff ${noDeg}deg 360deg)`;
}

loadDashboard();
