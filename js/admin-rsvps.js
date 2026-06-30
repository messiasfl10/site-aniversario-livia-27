AdminCommon.setupLogout();

const rsvpsTableBody = document.getElementById("rsvpsTableBody");
const rsvpSearchInput = document.getElementById("rsvpSearchInput");
const rsvpPresenceFilter = document.getElementById("rsvpPresenceFilter");
const rsvpCompanionFilter = document.getElementById("rsvpCompanionFilter");
const rsvpBuffetFilter = document.getElementById("rsvpBuffetFilter");
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
let buffetPayingAge = BuffetMetrics.DEFAULT_PAYING_AGE;
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
  setFilterValueFromParam(rsvpBuffetFilter, params, "buffet");
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
  if (presence === "Sim") {
    return `<span class="admin-badge badge-available">Sim</span>`;
  }

  if (presence === "Não") {
    return `<span class="admin-badge badge-danger">Não</span>`;
  }

  return `<span class="admin-badge badge-muted">-</span>`;
}

function renderCoupleDetails(rsvp) {
  const members = rsvp.guest_data?.members || [];

  if (!members.length) {
    return "";
  }

  return `
    <div class="couple-details">
      ${members
        .map(
          (member) => `
            <div>
              ${member.name}:
              <strong>${member.presence}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderCompanionDetails(rsvp) {
  const companions = rsvp.guest_data?.companions || [];

  if (!companions.length) {
    return `<span class="admin-muted">-</span>`;
  }

  return `
    <div class="companion-details">
      ${companions
        .map((companion) => {
          const childInfo =
            companion.is_child === "Sim"
              ? ` <span class="child-info">Criança${
                  companion.age ? ` · ${companion.age}` : ""
                } · ${BuffetMetrics.getCategoryLabel(
                  BuffetMetrics.classifyChild(
                    companion.age,
                    buffetPayingAge,
                  ),
                )}</span>`
              : "";

          return `
            <div>
              ${companion.name || "Sem nome"}
              ${childInfo}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
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
          ? `criança${companion.age ? `, ${companion.age}` : ""}`
          : "adulto";

      return `${companion.name || "Sem nome"} (${childInfo})`;
    })
    .join("; ");
}

function renderAdminIcon(name) {
  const icons = {
    trash:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>',
  };

  return icons[name] || "";
}

async function loadRSVPsAdmin() {
  const { data: guests, error: guestsError } = await supabaseClient
    .from("guests")
    .select("*");

  const { data: rsvps, error: rsvpsError } = await supabaseClient
    .from("rsvps")
    .select("*");

  const { data: settings, error: settingsError } = await supabaseClient
    .from("settings")
    .select("buffet_paying_age")
    .limit(1)
    .maybeSingle();

  if (guestsError || rsvpsError || settingsError) {
    console.error(guestsError || rsvpsError || settingsError);
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
  buffetPayingAge = BuffetMetrics.normalizePayingAge(
    settings?.buffet_paying_age,
  );
  applyRSVPFilters();
}

function renderRSVPTable(rsvps, guests) {
  const guestMap = {};

  guests.forEach((guest) => {
    guestMap[guest.id] = guest.name;
  });

  if (!rsvps.length) {
    rsvpsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="admin-empty-state">
          Nenhum RSVP encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  rsvpsTableBody.innerHTML = rsvps
    .map((rsvp) => {
      const guestName =
        guestMap[rsvp.guest_id] ||
        rsvp.guest_data?.name ||
        "Convidado não encontrado";

      const companionCount = Number(rsvp.guest_data?.guest_count || 0);

      return `
        <tr>
          <td>${guestName}</td>
          <td>
            ${renderPresenceBadge(rsvp.presence)}
            ${renderCoupleDetails(rsvp)}
          </td>
          <td>${companionCount}</td>
          <td>${renderCompanionDetails(rsvp)}</td>
          <td>${rsvp.food || "-"}</td>
          <td>${rsvp.message || "-"}</td>
          <td>${formatDate(rsvp.updated_at || rsvp.created_at)}</td>
          <td>
            <button
              class="admin-action-button danger icon-action icon-only"
              onclick='deleteRSVPFromTable("${rsvp.id}", "${rsvp.guest_id}")'
              title="Remover RSVP"
              aria-label="Remover RSVP"
            >
              ${renderAdminIcon("trash")}
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function applyRSVPFilters() {
  const guestMap = getRSVPGuestMap();
  const guestRecordMap = cachedRSVPGuests.reduce((map, guest) => {
    map[guest.id] = guest;
    return map;
  }, {});

  const search = normalizeText(rsvpSearchInput?.value);
  const presence = rsvpPresenceFilter?.value || "";
  const companionFilter = rsvpCompanionFilter?.value || "";
  const buffetFilter = rsvpBuffetFilter?.value || "";

  const filteredRSVPs = cachedRSVPs.filter((rsvp) => {
    const guestName =
      guestMap[rsvp.guest_id] ||
      rsvp.guest_data?.name ||
      "Convidado não encontrado";
    const companions = rsvp.guest_data?.companions || [];
    const members = rsvp.guest_data?.members || [];
    const companionCount = Number(rsvp.guest_data?.guest_count || 0);
    const buffetMetrics = BuffetMetrics.getRSVPMetrics(
      guestRecordMap[rsvp.guest_id],
      rsvp,
      buffetPayingAge,
    );

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
    const matchesBuffet =
      !buffetFilter ||
      (buffetFilter === "paying" && buffetMetrics.payingPeople > 0) ||
      (buffetFilter === "children" && buffetMetrics.children > 0) ||
      (buffetFilter === "child-paying" &&
        buffetMetrics.payingChildren > 0) ||
      (buffetFilter === "child-non-paying" &&
        buffetMetrics.nonPayingChildren > 0) ||
      (buffetFilter === "child-unknown" &&
        buffetMetrics.unknownAgeChildren > 0);

    return (
      matchesSearch &&
      matchesPresence &&
      matchesCompanions &&
      matchesBuffet
    );
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
  const guestRecordMap = cachedRSVPGuests.reduce((map, guest) => {
    map[guest.id] = guest;
    return map;
  }, {});
  const getMetrics = (rsvp) =>
    BuffetMetrics.getRSVPMetrics(
      guestRecordMap[rsvp.guest_id],
      rsvp,
      buffetPayingAge,
    );

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
      label: "Total de Pessoas",
      value: (rsvp) => getMetrics(rsvp).totalPeople,
    },
    {
      label: "Convidados Pagantes",
      value: (rsvp) => getMetrics(rsvp).payingPeople,
    },
    {
      label: "Total de Crianças",
      value: (rsvp) => getMetrics(rsvp).children,
    },
    {
      label: "Crianças Pagantes",
      value: (rsvp) => getMetrics(rsvp).payingChildren,
    },
    {
      label: "Crianças Não Pagantes",
      value: (rsvp) => getMetrics(rsvp).nonPayingChildren,
    },
    {
      label: "Crianças Sem Idade",
      value: (rsvp) => getMetrics(rsvp).unknownAgeChildren,
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
    rsvpBuffetFilter,
  ].forEach((filter) => {
    if (filter) {
      filter.value = "";
    }
  });

  applyRSVPFilters();
}

window.deleteRSVPFromTable = async function (rsvpId, guestId) {
  const confirmed = confirm("Deseja remover esta confirmação de presença?");

  if (!confirmed) {
    return;
  }

  const { error } = await supabaseClient.from("rsvps").delete().eq("id", rsvpId);

  if (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao remover RSVP.");
    return;
  }

  await supabaseClient
    .from("guests")
    .update({
      confirmed: false,
    })
    .eq("id", guestId);

  showAdminToast("💜 RSVP removido com sucesso!");
  await loadRSVPsAdmin();
};

[
  rsvpSearchInput,
  rsvpPresenceFilter,
  rsvpCompanionFilter,
  rsvpBuffetFilter,
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
