AdminCommon.setupLogout();

const rsvpsTableBody = document.getElementById("rsvpsTableBody");
const rsvpSearchInput = document.getElementById("rsvpSearchInput");
const rsvpPresenceFilter = document.getElementById("rsvpPresenceFilter");
const rsvpCompanionFilter = document.getElementById("rsvpCompanionFilter");
const rsvpFilterCount = document.getElementById("rsvpFilterCount");
const exportRSVPsButton = document.getElementById("exportRSVPsButton");
const clearRSVPFiltersButton = document.getElementById(
  "clearRSVPFiltersButton",
);
const { formatDate } = AdminCommon;
const showAdminToast = AdminCommon.showToast;
let cachedRSVPs = [];
let cachedRSVPGuests = [];
let visibleRSVPs = [];
let rsvpSortState = {
  key: "updated",
  direction: "desc",
};

function getAdminPageParams() {
  return new URLSearchParams(window.location.search);
}

function setFilterValueFromParam(element, params, name) {
  if (!element || !params.has(name)) {
    return;
  }

  element.value = params.get(name) || "";
}

function applyRSVPFiltersFromUrl() {
  const params = getAdminPageParams();

  setFilterValueFromParam(rsvpSearchInput, params, "search");
  setFilterValueFromParam(rsvpPresenceFilter, params, "presence");
  setFilterValueFromParam(rsvpCompanionFilter, params, "companions");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compareValues(a, b) {
  if (typeof a === "number" || typeof b === "number") {
    return Number(a || 0) - Number(b || 0);
  }

  return String(a || "").localeCompare(String(b || ""), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function renderPresenceBadge(presence) {
  const badge = document.createElement("span");

  if (presence === "Não") {
    badge.className = "admin-badge badge-danger";
    badge.textContent = "Não";
    return badge;
  }

  if (presence === "Sim") {
    badge.className = "admin-badge badge-available";
    badge.textContent = "Sim";
    return badge;
  }

  badge.className = "admin-badge badge-muted";
  badge.textContent = "-";
  return badge;
}

function renderCoupleDetails(rsvp) {
  const members = rsvp.guest_data?.members || [];

  if (!members.length) {
    return null;
  }

  const details = document.createElement("div");
  details.className = "couple-details";

  members.forEach((member) => {
    const row = document.createElement("div");
    row.append(
      document.createTextNode(`${member.name || "Sem nome"}: `),
    );

    const presence = document.createElement("strong");
    presence.textContent = member.presence || "-";
    row.appendChild(presence);
    details.appendChild(row);
  });

  return details;
}

function renderCompanionDetails(rsvp) {
  const companions = rsvp.guest_data?.companions || [];

  if (!companions.length) {
    const empty = document.createElement("span");
    empty.className = "admin-muted";
    empty.textContent = "-";
    return empty;
  }

  const details = document.createElement("div");
  details.className = "companion-details";

  companions.forEach((companion) => {
    const row = document.createElement("div");
    row.append(document.createTextNode(companion.name || "Sem nome"));

    if (companion.is_child === "Sim") {
      const childInfo = document.createElement("span");
      childInfo.className = "child-info";
      childInfo.textContent = "Criança";
      row.append(document.createTextNode(" "), childInfo);
    }

    details.appendChild(row);
  });

  return details;
}

function getRSVPGuestMap() {
  return cachedRSVPGuests.reduce((map, guest) => {
    map[guest.id] = guest.name;
    return map;
  }, {});
}

function getRSVPGuestName(rsvp, guestMap) {
  return (
    guestMap[rsvp.guest_id] ||
    rsvp.guest_data?.name ||
    "Convidado nao encontrado"
  );
}

function formatRSVPMembers(rsvp) {
  return (rsvp.guest_data?.members || [])
    .map((member) => `${member.name || "Sem nome"}: ${member.presence || "-"}`)
    .join("; ");
}

function formatRSVPCompanions(rsvp) {
  return (rsvp.guest_data?.companions || [])
    .map((companion) => {
      const childInfo =
        companion.is_child === "Sim"
          ? "criança"
          : "adulto";

      return `${companion.name || "Sem nome"} (${childInfo})`;
    })
    .join("; ");
}

function createTrashIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  [
    "M3 6h18",
    "M8 6V4h8v2",
    "M19 6l-1 14H6L5 6",
    "M10 11v5",
    "M14 11v5",
  ].forEach((pathData) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
  });

  return svg;
}

async function loadRSVPsAdmin() {
  const { data: guests, error: guestsError } = await supabaseClient
    .from("guests")
    .select("*");

  const { data: rsvps, error: rsvpsError } = await supabaseClient
    .from("rsvps")
    .select("*");

  if (guestsError || rsvpsError) {
    console.error(guestsError || rsvpsError);
    showAdminToast("⚠️ Erro ao carregar confirmações.");
    return;
  }

  const activeGuests = guests.filter((guest) => guest.active);
  const activeGuestIds = activeGuests.map((guest) => guest.id);
  const activeRSVPs = rsvps.filter((rsvp) =>
    activeGuestIds.includes(rsvp.guest_id),
  );

  cachedRSVPs = activeRSVPs;
  cachedRSVPGuests = activeGuests;
  applyRSVPFilters();
}

function renderRSVPTable(rsvps, guests) {
  const guestMap = {};

  guests.forEach((guest) => {
    guestMap[guest.id] = guest.name;
  });

  rsvpsTableBody.replaceChildren();

  if (!rsvps.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "admin-empty-state";
    cell.textContent = "Nenhum RSVP encontrado para os filtros selecionados.";
    row.appendChild(cell);
    rsvpsTableBody.appendChild(row);
    return;
  }

  rsvps.forEach((rsvp) => {
    const guestName =
      guestMap[rsvp.guest_id] ||
      rsvp.guest_data?.name ||
      "Convidado não encontrado";

    const companionCount = Number(rsvp.guest_data?.guest_count || 0);
    const row = document.createElement("tr");

    [
      guestName,
      String(companionCount),
      rsvp.food || "-",
      rsvp.message || "-",
      formatDate(rsvp.updated_at || rsvp.created_at),
    ].forEach((value, index) => {
      if (index === 1) {
        return;
      }

      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);

      if (index === 0) {
        const presenceCell = document.createElement("td");
        presenceCell.appendChild(renderPresenceBadge(rsvp.presence));
        const coupleDetails = renderCoupleDetails(rsvp);

        if (coupleDetails) {
          presenceCell.appendChild(coupleDetails);
        }

        row.appendChild(presenceCell);

        const countCell = document.createElement("td");
        countCell.textContent = String(companionCount);
        row.appendChild(countCell);

        const companionCell = document.createElement("td");
        companionCell.appendChild(renderCompanionDetails(rsvp));
        row.appendChild(companionCell);
      }
    });

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "admin-action-button danger icon-action icon-only";
    deleteButton.type = "button";
    deleteButton.title = "Remover RSVP";
    deleteButton.setAttribute("aria-label", "Remover RSVP");
    deleteButton.appendChild(createTrashIcon());
    deleteButton.addEventListener("click", () => {
      deleteRSVPFromTable(rsvp.id);
    });
    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);
    rsvpsTableBody.appendChild(row);
  });
}

function applyRSVPFilters() {
  const guestMap = getRSVPGuestMap();
  const search = normalizeText(rsvpSearchInput?.value);
  const presence = rsvpPresenceFilter?.value || "";
  const companionFilter = rsvpCompanionFilter?.value || "";

  const filteredRSVPs = cachedRSVPs.filter((rsvp) => {
    const guestName =
      guestMap[rsvp.guest_id] ||
      rsvp.guest_data?.name ||
      "Convidado não encontrado";
    const companions = rsvp.guest_data?.companions || [];
    const members = rsvp.guest_data?.members || [];
    const companionCount = Number(rsvp.guest_data?.guest_count || 0);

    const searchable = normalizeText(
      [
        guestName,
        rsvp.food,
        rsvp.message,
        ...companions.map((companion) => companion.name),
        ...members.map((member) => member.name),
      ].join(" "),
    );

    const matchesSearch = !search || searchable.includes(search);
    const matchesPresence = !presence || rsvp.presence === presence;
    const matchesCompanions =
      !companionFilter ||
      (companionFilter === "with"
        ? companionCount > 0
        : companionCount === 0);
    return matchesSearch && matchesPresence && matchesCompanions;
  });

  const sortedRSVPs = sortRSVPs(filteredRSVPs, guestMap);
  visibleRSVPs = sortedRSVPs;

  updateRSVPFilterCount(sortedRSVPs.length);
  updateRSVPSortButtons();
  renderRSVPTable(sortedRSVPs, cachedRSVPGuests);
}

function getRSVPSortValue(rsvp, guestMap) {
  const guestName =
    guestMap[rsvp.guest_id] ||
    rsvp.guest_data?.name ||
    "Convidado não encontrado";

  const sortValues = {
    companions: Number(rsvp.guest_data?.guest_count || 0),
    guest: guestName,
    presence: rsvp.presence,
    updated: rsvp.updated_at || rsvp.created_at
      ? new Date(rsvp.updated_at || rsvp.created_at).getTime()
      : 0,
  };

  return sortValues[rsvpSortState.key] ?? "";
}

function sortRSVPs(rsvps, guestMap) {
  return [...rsvps].sort((a, b) => {
    const result = compareValues(
      getRSVPSortValue(a, guestMap),
      getRSVPSortValue(b, guestMap),
    );

    return rsvpSortState.direction === "asc" ? result : -result;
  });
}

function updateRSVPSortButtons() {
  document.querySelectorAll("[data-rsvp-sort]").forEach((button) => {
    button.classList.remove("sorted-asc", "sorted-desc");

    if (button.dataset.rsvpSort === rsvpSortState.key) {
      button.classList.add(`sorted-${rsvpSortState.direction}`);
    }
  });
}

function setRSVPSort(key) {
  if (rsvpSortState.key === key) {
    rsvpSortState.direction =
      rsvpSortState.direction === "asc" ? "desc" : "asc";
  } else {
    rsvpSortState = {
      key,
      direction: "asc",
    };
  }

  applyRSVPFilters();
}

function updateRSVPFilterCount(count) {
  if (!rsvpFilterCount) {
    return;
  }

  const total = cachedRSVPs.length;
  rsvpFilterCount.textContent =
    count === total
      ? `${total} RSVP${total === 1 ? "" : "s"}`
      : `${count} de ${total} RSVP${total === 1 ? "" : "s"}`;
}

function exportRSVPsCSV() {
  if (!visibleRSVPs.length) {
    showAdminToast("Nenhum RSVP para exportar.");
    return;
  }

  const guestMap = getRSVPGuestMap();
  const getChildren = (rsvp) => (rsvp.guest_data?.companions || [])
    .filter((companion) => companion.is_child === "Sim").length;

  AdminExport.downloadCSV("rsvps", [
    { label: "Convidado", value: (rsvp) => getRSVPGuestName(rsvp, guestMap) },
    { label: "Presença", value: "presence" },
    { label: "Membros do casal", value: formatRSVPMembers },
    {
      label: "Quantidade de acompanhantes",
      value: (rsvp) => Number(rsvp.guest_data?.guest_count || 0),
    },
    { label: "Acompanhantes", value: formatRSVPCompanions },
    {
      label: "Total de Crianças",
      value: getChildren,
    },
    { label: "Restrição Alimentar", value: "food" },
    { label: "Mensagem", value: "message" },
    {
      label: "Atualizado em",
      value: (rsvp) => formatDate(rsvp.updated_at || rsvp.created_at),
    },
  ], visibleRSVPs);

  showAdminToast("CSV de RSVPs exportado.");
}

function clearRSVPFilters() {
  if (rsvpSearchInput) {
    rsvpSearchInput.value = "";
  }

  [
    rsvpPresenceFilter,
    rsvpCompanionFilter,
  ].forEach((filter) => {
    if (filter) {
      filter.value = "";
    }
  });

  applyRSVPFilters();
}

window.deleteRSVPFromTable = async function (rsvpId) {
  const confirmed = confirm("Deseja remover esta confirmação de presença?");

  if (!confirmed) {
    return;
  }

  const { error } = await supabaseClient.rpc("delete_admin_rsvp", {
    target_rsvp_id: rsvpId,
  });

  if (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao remover RSVP.");
    return;
  }

  showAdminToast("💜 RSVP removido com sucesso!");
  await loadRSVPsAdmin();
};

[
  rsvpSearchInput,
  rsvpPresenceFilter,
  rsvpCompanionFilter,
].forEach((filter) => {
  filter?.addEventListener("input", applyRSVPFilters);
  filter?.addEventListener("change", applyRSVPFilters);
});

clearRSVPFiltersButton?.addEventListener("click", clearRSVPFilters);
exportRSVPsButton?.addEventListener("click", exportRSVPsCSV);

document.querySelectorAll("[data-rsvp-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    setRSVPSort(button.dataset.rsvpSort);
  });
});

applyRSVPFiltersFromUrl();
loadRSVPsAdmin();
