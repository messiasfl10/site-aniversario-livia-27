AdminCommon.setupLogout();

let editingGuest = null;
let selectedRSVPGuest = null;
let selectedExistingRSVP = null;
let cachedAdminRSVPCompanions = [];
let cachedGuests = [];
let visibleGuests = [];
let guestSortState = {
  key: "name",
  direction: "asc",
};

const guestSearchInput = document.getElementById("guestSearchInput");
const guestStatusFilter = document.getElementById("guestStatusFilter");
const guestConfirmedFilter = document.getElementById("guestConfirmedFilter");
const guestTypeFilter = document.getElementById("guestTypeFilter");
const guestFilterCount = document.getElementById("guestFilterCount");
const exportGuestsButton = document.getElementById("exportGuestsButton");
const clearGuestFiltersButton = document.getElementById(
  "clearGuestFiltersButton",
);
const guestsTableBody = document.getElementById("guestsTableBody");
const guestModal = document.getElementById("guestModal");
const openGuestModalButton = document.getElementById("openGuestModalButton");
const closeGuestModalButton = document.getElementById("closeGuestModalButton");
const guestForm = document.getElementById("guestForm");
const guestModalTitle = document.getElementById("guestModalTitle");
const guestInviteTypeInput = document.getElementById("guestInviteTypeInput");
const coupleFields = document.getElementById("coupleFields");
const adminRSVPModal = document.getElementById("adminRSVPModal");
const closeAdminRSVPModalButton = document.getElementById(
  "closeAdminRSVPModalButton",
);
const adminRSVPForm = document.getElementById("adminRSVPForm");
const adminRSVPModalTitle = document.getElementById("adminRSVPModalTitle");
const adminRSVPPresenceGroup = document.getElementById(
  "adminRSVPPresenceGroup",
);
const adminRSVPPresenceInput = document.getElementById(
  "adminRSVPPresenceInput",
);
const adminRSVPCoupleMembers = document.getElementById(
  "adminRSVPCoupleMembers",
);
const adminRSVPEmailInput = document.getElementById("adminRSVPEmailInput");
const adminRSVPPhoneInput = document.getElementById("adminRSVPPhoneInput");
const adminRSVPGuestCountInput = document.getElementById(
  "adminRSVPGuestCountInput",
);
const adminRSVPGuestFields = document.getElementById("adminRSVPGuestFields");
const adminRSVPFoodInput = document.getElementById("adminRSVPFoodInput");
const adminRSVPMessageInput = document.getElementById("adminRSVPMessageInput");
const deleteAdminRSVPButton = document.getElementById("deleteAdminRSVPButton");
const guestDetailsModal = document.getElementById("guestDetailsModal");
const closeGuestDetailsModalButton = document.getElementById(
  "closeGuestDetailsModalButton",
);
const guestDetailsTitle = document.getElementById("guestDetailsTitle");
const guestDetailsContent = document.getElementById("guestDetailsContent");
const { formatDate } = AdminCommon;
const showAdminToast = AdminCommon.showToast;

function getAdminPageParams() {
  return new URLSearchParams(window.location.search);
}

function setFilterValueFromParam(element, params, name) {
  if (!element || !params.has(name)) {
    return;
  }

  element.value = params.get(name) || "";
}

function applyGuestFiltersFromUrl() {
  const params = getAdminPageParams();

  setFilterValueFromParam(guestSearchInput, params, "search");
  setFilterValueFromParam(guestStatusFilter, params, "status");
  setFilterValueFromParam(guestConfirmedFilter, params, "confirmed");
  setFilterValueFromParam(guestTypeFilter, params, "type");
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

function maskPhoneInput(input) {
  input.addEventListener("input", (event) => {
    let value = event.target.value.replace(/\D/g, "");

    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d+).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d+).*/, "($1) $2");
    } else if (value.length > 0) {
      value = value.replace(/^(\d+)/, "($1");
    }

    event.target.value = value;
  });
}

function renderInviteTypeBadge(type) {
  if (type === "couple") {
    return `<span class="admin-badge badge-payment">Casal</span>`;
  }

  return `<span class="admin-badge badge-muted">Individual</span>`;
}

function renderAdminIcon(name) {
  const icons = {
    clipboard:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8"/><path d="M9 3h6v4H9z"/><path d="M7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1"/></svg>',
    edit:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    eye:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    power:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>',
    rsvp:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/></svg>',
  };

  return icons[name] || "";
}

function renderGuestActions(guest) {
  return `
    <div class="admin-actions compact-actions">
      <button
        class="admin-action-button icon-action"
        onclick='openGuestDetailsModal(${JSON.stringify(guest)})'
        title="Ver detalhes"
      >
        ${renderAdminIcon("eye")}
        Detalhes
      </button>

      <button
        class="admin-action-button icon-action"
        onclick='openEditGuestModal(${JSON.stringify(guest)})'
        title="Editar convidado"
      >
        ${renderAdminIcon("edit")}
        Editar
      </button>
    </div>
  `;
}

function renderGuestCoupleMembers(guest) {
  const members = guest.couple_members || [];

  if (guest.invite_type !== "couple" || !members.length) {
    return "";
  }

  return `
    <section class="admin-details-section">
      <span class="admin-details-label">Casal</span>
      <div class="admin-details-list">
        ${members
          .map(
            (member) => `
              <div class="admin-details-item">
                <div>
                  <strong>${member.name || "Sem nome"}</strong>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderGuestInviteMeta(guest) {
  const items = [
    ["Código", `<code>${guest.invite_code}</code>`],
    ["Acompanhantes", guest.max_guests || 0],
    ["Último acesso", formatDate(guest.last_access)],
    ["Acessos", guest.access_count || 0],
  ];

  return `
    <div class="admin-details-meta-grid">
      ${items
        .map(
          ([label, value]) => `
            <div class="admin-details-meta-item">
              <span>${label}</span>
              <strong>${value}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function getInviteTypeLabel(type) {
  return type === "couple" ? "Casal" : "Individual";
}

function formatBoolean(value) {
  return value ? "Sim" : "Nao";
}

function getGuestPlanningCounts(guest) {
  if (!guest.active) {
    return {
      companions: 0,
      invitedGuests: 0,
      total: 0,
    };
  }

  const invitedGuests = guest.invite_type === "couple" ? 2 : 1;
  const companions = Math.max(0, Number(guest.max_guests || 0));

  return {
    companions,
    invitedGuests,
    total: invitedGuests + companions,
  };
}

function calculateGuestPlanningSummary(guests) {
  return guests.reduce(
    (summary, guest) => {
      const counts = getGuestPlanningCounts(guest);

      summary.invitedGuests += counts.invitedGuests;
      summary.companions += counts.companions;
      summary.total += counts.total;

      return summary;
    },
    {
      companions: 0,
      invitedGuests: 0,
      total: 0,
    },
  );
}

function renderGuestDetailsActions(guest) {
  const activeActionLabel = guest.active
    ? "Desativar convidado"
    : "Ativar convidado";
  const activeActionDescription = guest.active
    ? "Impede o acesso do convite sem remover o cadastro."
    : "Reativa o acesso deste convite.";

  return `
    <div class="admin-detail-action-grid">
      <button
        class="admin-detail-action-card"
        onclick='closeGuestDetailsModal(); openEditGuestModal(${JSON.stringify(guest)})'
      >
        <span class="admin-detail-action-icon">${renderAdminIcon("edit")}</span>
        <span>
          <strong>Editar convidado</strong>
          <small>Altera nome, tipo de convite, acompanhantes e permissão.</small>
        </span>
      </button>

      <button
        class="admin-detail-action-card ${guest.active ? "danger" : "success"}"
        onclick='closeGuestDetailsModal(); toggleGuestActive("${guest.id}", ${!guest.active})'
      >
        <span class="admin-detail-action-icon">${renderAdminIcon("power")}</span>
        <span>
          <strong>${activeActionLabel}</strong>
          <small>${activeActionDescription}</small>
        </span>
      </button>

      <button
        class="admin-detail-action-card"
        onclick='copyInviteCode("${guest.invite_code}")'
      >
        <span class="admin-detail-action-icon">${renderAdminIcon("clipboard")}</span>
        <span>
          <strong>Copiar código</strong>
          <small>Copia o código de acesso deste convite.</small>
        </span>
      </button>

      <button
        class="admin-detail-action-card"
        onclick='closeGuestDetailsModal(); openAdminRSVPModal(${JSON.stringify(guest)})'
      >
        <span class="admin-detail-action-icon">${renderAdminIcon("rsvp")}</span>
        <span>
          <strong>RSVP manual</strong>
          <small>Cria ou atualiza a confirmação de presença.</small>
        </span>
      </button>
    </div>
  `;
}

window.openGuestDetailsModal = function (guest) {
  guestDetailsTitle.textContent = guest.name || "Detalhes do Convidado";

  guestDetailsContent.innerHTML = `
    <section class="admin-details-section">
      <span class="admin-details-label">Resumo</span>
      <div class="guest-situation-stack">
        ${renderInviteTypeBadge(guest.invite_type)}
        ${
          guest.confirmed
            ? '<span class="admin-badge badge-available">RSVP confirmado</span>'
            : '<span class="admin-badge badge-muted">RSVP pendente</span>'
        }
        ${
          guest.active
            ? '<span class="admin-badge badge-available">Ativo</span>'
            : '<span class="admin-badge badge-danger">Inativo</span>'
        }
      </div>
    </section>

    <section class="admin-details-section">
      <span class="admin-details-label">Ações</span>
      ${renderGuestDetailsActions(guest)}
    </section>

    <section class="admin-details-section">
      <span class="admin-details-label">Convite</span>
      ${renderGuestInviteMeta(guest)}
    </section>

    ${renderGuestCoupleMembers(guest)}
  `;

  guestDetailsModal.classList.add("active");
};

window.closeGuestDetailsModal = function () {
  guestDetailsModal.classList.remove("active");
};

async function loadGuestsAdmin() {
  const { data, error } = await supabaseClient
    .from("guests")
    .select("*")
    .order("name");

  if (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao carregar convidados.");
    return;
  }

  cachedGuests = data || [];
  applyGuestFilters();
}

function renderGuestsTable(guests) {
  if (!guests.length) {
    guestsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="admin-empty-state">
          Nenhum convidado encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  guestsTableBody.innerHTML = guests
    .map(
      (guest) => `
        <tr>
          <td>${guest.name}</td>
          <td>${renderInviteTypeBadge(guest.invite_type)}</td>
          <td>${guest.max_guests || 0}</td>
          <td>
            ${
              guest.confirmed
                ? '<span class="admin-badge badge-available">Sim</span>'
                : '<span class="admin-badge badge-muted">Não</span>'
            }
          </td>
          <td>
            ${
              guest.active
                ? '<span class="admin-badge badge-available">Ativo</span>'
                : '<span class="admin-badge badge-danger">Inativo</span>'
            }
          </td>
          <td>
            <button
              type="button"
              class="admin-code-button"
              onclick='copyInviteCode("${guest.invite_code}")'
              title="Copiar código"
              aria-label="Copiar código ${guest.invite_code}"
            >
              <code>${guest.invite_code}</code>
            </button>
          </td>
          <td>${formatDate(guest.last_access)}</td>
          <td>${guest.access_count || 0}</td>
          <td>${renderGuestActions(guest)}</td>
        </tr>
      `,
    )
    .join("");
}

function applyGuestFilters() {
  const search = normalizeText(guestSearchInput?.value);
  const status = guestStatusFilter?.value || "";
  const confirmed = guestConfirmedFilter?.value || "";
  const type = guestTypeFilter?.value || "";

  const filteredGuests = cachedGuests.filter((guest) => {
    const searchable = normalizeText(
      [
        guest.name,
        guest.invite_code,
        guest.invite_type,
        ...(guest.couple_members || []).map((member) => member.name),
      ].join(" "),
    );

    const matchesSearch = !search || searchable.includes(search);
    const matchesStatus =
      !status || (status === "active" ? guest.active : !guest.active);
    const matchesConfirmed =
      !confirmed ||
      (confirmed === "confirmed" ? guest.confirmed : !guest.confirmed);
    const matchesType = !type || guest.invite_type === type;
    return (
      matchesSearch &&
      matchesStatus &&
      matchesConfirmed &&
      matchesType
    );
  });

  const sortedGuests = sortGuests(filteredGuests);
  visibleGuests = sortedGuests;

  updateGuestFilterCount(sortedGuests.length);
  updateGuestSortButtons();
  renderGuestsTable(sortedGuests);
}

function exportGuestsCSV() {
  if (!visibleGuests.length) {
    showAdminToast("Nenhum convidado para exportar.");
    return;
  }

  const columns = [
    { label: "Nome", value: "name" },
    { label: "Tipo", value: (guest) => getInviteTypeLabel(guest.invite_type) },
    { label: "Pessoas do casal", value: (guest) =>
      (guest.couple_members || []).map((member) => member.name).filter(Boolean),
    },
    {
      label: "Convidados planejados",
      value: (guest) => getGuestPlanningCounts(guest).invitedGuests,
    },
    {
      label: "Acompanhantes planejados",
      value: (guest) => getGuestPlanningCounts(guest).companions,
    },
    {
      label: "Total planejado",
      value: (guest) => getGuestPlanningCounts(guest).total,
    },
    { label: "RSVP confirmado", value: (guest) => formatBoolean(guest.confirmed) },
    { label: "Ativo", value: (guest) => formatBoolean(guest.active) },
    { label: "Codigo", value: "invite_code" },
    { label: "Ultimo acesso", value: (guest) => formatDate(guest.last_access) },
    { label: "Acessos", value: (guest) => Number(guest.access_count || 0) },
  ];
  const rows = AdminExport.buildRows(columns, visibleGuests);
  const summary = calculateGuestPlanningSummary(visibleGuests);

  rows.push(
    [],
    ["Resumo do Planejamento"],
    ["Total de Convidados", summary.invitedGuests],
    ["Total de Acompanhantes", summary.companions],
    ["Total Planejado", summary.total],
  );

  AdminExport.downloadCSVRows("convidados", rows);

  showAdminToast("CSV de convidados exportado.");
}

function getGuestSortValue(guest) {
  const sortValues = {
    accesses: Number(guest.access_count || 0),
    code: guest.invite_code,
    companions: Number(guest.max_guests || 0),
    confirmed: guest.confirmed ? 1 : 0,
    lastAccess: guest.last_access ? new Date(guest.last_access).getTime() : 0,
    name: guest.name,
    status: guest.active ? 1 : 0,
    type: guest.invite_type,
  };

  return sortValues[guestSortState.key] ?? "";
}

function sortGuests(guests) {
  return [...guests].sort((a, b) => {
    const result = compareValues(getGuestSortValue(a), getGuestSortValue(b));

    return guestSortState.direction === "asc" ? result : -result;
  });
}

function updateGuestSortButtons() {
  document.querySelectorAll("[data-guest-sort]").forEach((button) => {
    button.classList.remove("sorted-asc", "sorted-desc");

    if (button.dataset.guestSort === guestSortState.key) {
      button.classList.add(`sorted-${guestSortState.direction}`);
    }
  });
}

function setGuestSort(key) {
  if (guestSortState.key === key) {
    guestSortState.direction =
      guestSortState.direction === "asc" ? "desc" : "asc";
  } else {
    guestSortState = {
      key,
      direction: "asc",
    };
  }

  applyGuestFilters();
}

function updateGuestFilterCount(count) {
  if (!guestFilterCount) {
    return;
  }

  const total = cachedGuests.length;
  guestFilterCount.textContent =
    count === total
      ? `${total} convidado${total === 1 ? "" : "s"}`
      : `${count} de ${total} convidado${total === 1 ? "" : "s"}`;
}

function clearGuestFilters() {
  if (guestSearchInput) {
    guestSearchInput.value = "";
  }

  [
    guestStatusFilter,
    guestConfirmedFilter,
    guestTypeFilter,
  ].forEach((filter) => {
    if (filter) {
      filter.value = "";
    }
  });

  applyGuestFilters();
}

function openGuestModal() {
  editingGuest = null;
  guestModalTitle.textContent = "Novo Convidado";
  guestForm.reset();
  coupleFields.style.display = "none";
  document.getElementById("guestMaxGuestsInput").value = 0;
  guestModal.classList.add("active");
}

function closeGuestModal() {
  guestModal.classList.remove("active");
}

window.openEditGuestModal = function (guest) {
  editingGuest = guest;
  guestModalTitle.textContent = "Editar Convidado";
  document.getElementById("guestNameInput").value = guest.name || "";
  guestInviteTypeInput.value = guest.invite_type || "individual";
  document.getElementById("guestMaxGuestsInput").value = guest.max_guests || 0;

  if (guest.invite_type === "couple") {
    coupleFields.style.display = "block";
    document.getElementById("coupleMemberOneInput").value =
      guest.couple_members?.[0]?.name || "";
    document.getElementById("coupleMemberTwoInput").value =
      guest.couple_members?.[1]?.name || "";
  } else {
    coupleFields.style.display = "none";
    document.getElementById("coupleMemberOneInput").value = "";
    document.getElementById("coupleMemberTwoInput").value = "";
  }

  guestModal.classList.add("active");
};

window.toggleGuestActive = async function (guestId, nextActive) {
  const confirmed = confirm(
    nextActive
      ? "Deseja reativar este convidado?"
      : "Deseja desativar este convidado?",
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabaseClient.rpc("set_guest_active", {
    target_guest_id: guestId,
    next_active: nextActive,
  });

  if (error) {
    console.error(error);
    showAdminToast(
      nextActive
        ? "⚠️ Erro ao reativar convidado."
        : "⚠️ Erro ao desativar convidado.",
    );
    return;
  }

  showAdminToast(
    nextActive
      ? "💜 Convidado reativado com sucesso!"
      : "💜 Convidado desativado com sucesso!",
  );

  await loadGuestsAdmin();
};

window.copyInviteCode = async function (code) {
  try {
    await navigator.clipboard.writeText(code);
    showAdminToast("💜 Código copiado com sucesso!");
  } catch (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao copiar código.");
  }
};

function closeAdminRSVPModal() {
  adminRSVPModal.classList.remove("active");
  selectedRSVPGuest = null;
  selectedExistingRSVP = null;
}

function renderAdminRSVPGuestOptions(maxGuests) {
  adminRSVPGuestCountInput.innerHTML = "";

  for (let i = 0; i <= maxGuests; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    adminRSVPGuestCountInput.appendChild(option);
  }
}

function getAdminRSVPCompanions() {
  const companions = [];
  const count = Number(adminRSVPGuestCountInput.value || 0);

  for (let i = 1; i <= count; i++) {
    companions.push({
      name:
        document.querySelector(`.admin-rsvp-companion-name[data-index="${i}"]`)
          ?.value || "",
      is_child:
        document.querySelector(`.admin-rsvp-companion-child[data-index="${i}"]`)
          ?.value || "Não",
    });
  }

  return companions;
}

function renderAdminRSVPCompanionFields(companions = []) {
  adminRSVPGuestFields.innerHTML = "";

  const count = Number(adminRSVPGuestCountInput.value || 0);

  for (let i = 1; i <= count; i++) {
    const companion = companions[i - 1] || {};
    const wrapper = document.createElement("div");

    wrapper.classList.add("admin-rsvp-companion-card");
    wrapper.innerHTML = `
      <h4>Acompanhante ${i}</h4>

      <div class="admin-form-group">
        <label>Nome</label>
        <input
          type="text"
          class="admin-rsvp-companion-name"
          data-index="${i}"
          value="${companion.name || ""}"
          required
        >
      </div>

      <div class="admin-form-group">
        <label>É criança?</label>
        <select class="admin-rsvp-companion-child" data-index="${i}">
          <option value="Não" ${companion.is_child === "Não" ? "selected" : ""}>
            Não
          </option>
          <option value="Sim" ${companion.is_child === "Sim" ? "selected" : ""}>
            Sim
          </option>
        </select>
      </div>

    `;

    adminRSVPGuestFields.appendChild(wrapper);
  }
}

function hideAdminRSVPCompanions(keepCache = true) {
  if (keepCache) {
    const currentCompanions = getAdminRSVPCompanions();

    if (currentCompanions.length > 0) {
      cachedAdminRSVPCompanions = currentCompanions;
    }
  }

  const guestCountGroup = adminRSVPGuestCountInput.closest(".admin-form-group");

  if (guestCountGroup) {
    guestCountGroup.style.display = "none";
  }

  adminRSVPGuestCountInput.value = 0;
  adminRSVPGuestFields.innerHTML = "";
}

function showAdminRSVPCompanionsIfAllowed() {
  const maxGuests = selectedRSVPGuest?.max_guests || 0;

  if (maxGuests <= 0) {
    hideAdminRSVPCompanions(false);
    return;
  }

  const guestCountGroup = adminRSVPGuestCountInput.closest(".admin-form-group");

  if (guestCountGroup) {
    guestCountGroup.style.display = "block";
  }

  if (cachedAdminRSVPCompanions.length > 0) {
    adminRSVPGuestCountInput.value = cachedAdminRSVPCompanions.length;
    renderAdminRSVPCompanionFields(cachedAdminRSVPCompanions);
  }
}

function updateAdminRSVPCoupleCompanionVisibility() {
  const memberSelects = document.querySelectorAll(
    ".admin-rsvp-member-presence",
  );

  if (!memberSelects.length) {
    return;
  }

  const someoneIsComing = Array.from(memberSelects).some(
    (select) => select.value === "Sim",
  );

  if (someoneIsComing) {
    showAdminRSVPCompanionsIfAllowed();
  } else {
    hideAdminRSVPCompanions();
  }
}

window.openAdminRSVPModal = async function (selectedGuest) {
  selectedRSVPGuest = selectedGuest;
  adminRSVPForm.reset();
  adminRSVPGuestFields.innerHTML = "";
  adminRSVPModalTitle.textContent = `RSVP de ${selectedGuest.name}`;
  renderAdminRSVPGuestOptions(selectedGuest.max_guests || 0);

  const { data, error } = await supabaseClient
    .from("rsvps")
    .select("*")
    .eq("guest_id", selectedGuest.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao carregar RSVP.");
    return;
  }

  selectedExistingRSVP = data;
  deleteAdminRSVPButton.style.display = selectedExistingRSVP ? "block" : "none";
  cachedAdminRSVPCompanions = data?.guest_data?.companions || [];
  adminRSVPEmailInput.value = data?.email || "";
  adminRSVPPhoneInput.value = data?.phone || "";

  if (selectedGuest.invite_type === "couple") {
    adminRSVPPresenceGroup.style.display = "none";
    adminRSVPCoupleMembers.style.display = "block";

    const members = selectedGuest.couple_members || [];
    const existingMembers = data?.guest_data?.members || [];

    adminRSVPCoupleMembers.innerHTML = members
      .map((member, index) => {
        const existingPresence = existingMembers[index]?.presence || "Sim";

        return `
          <div class="admin-form-group">
            <label>${member.name}</label>
            <select class="admin-rsvp-member-presence" data-index="${index}">
              <option value="Sim" ${existingPresence === "Sim" ? "selected" : ""}>
                Sim
              </option>
              <option value="Não" ${existingPresence === "Não" ? "selected" : ""}>
                Não
              </option>
            </select>
          </div>
        `;
      })
      .join("");

    document
      .querySelectorAll(".admin-rsvp-member-presence")
      .forEach((select) => {
        select.addEventListener(
          "change",
          updateAdminRSVPCoupleCompanionVisibility,
        );
      });
  } else {
    adminRSVPPresenceGroup.style.display = "block";
    adminRSVPCoupleMembers.style.display = "none";
    adminRSVPPresenceInput.value = data?.presence || "Sim";
  }

  adminRSVPGuestCountInput.value = data?.guest_data?.guest_count || 0;

  const currentPresence = data?.presence || "Sim";
  const shouldShowCompanions =
    currentPresence === "Sim" && (selectedGuest.max_guests || 0) > 0;

  if (shouldShowCompanions) {
    showAdminRSVPCompanionsIfAllowed();
    renderAdminRSVPCompanionFields(cachedAdminRSVPCompanions);
  } else {
    hideAdminRSVPCompanions(false);
  }

  if (selectedGuest.invite_type === "couple") {
    updateAdminRSVPCoupleCompanionVisibility();
  }

  adminRSVPFoodInput.value = data?.food || "";
  adminRSVPMessageInput.value = data?.message || "";
  adminRSVPModal.classList.add("active");
};

guestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const inviteType = guestInviteTypeInput.value;
  const name = document.getElementById("guestNameInput").value.trim();
  const maxGuests = Number(
    document.getElementById("guestMaxGuestsInput").value || 0,
  );

  let coupleMembers = null;

  if (inviteType === "couple") {
    const memberOne = document
      .getElementById("coupleMemberOneInput")
      .value.trim();
    const memberTwo = document
      .getElementById("coupleMemberTwoInput")
      .value.trim();

    coupleMembers = [{ name: memberOne }, { name: memberTwo }];
  }

  const payload = {
    name,
    invite_type: inviteType,
    couple_members: coupleMembers,
    max_guests: maxGuests,
  };

  const result = editingGuest
    ? await supabaseClient.rpc("update_guest_details", {
        target_guest_id: editingGuest.id,
        guest_name: name,
        guest_invite_type: inviteType,
        guest_couple_members: coupleMembers,
        guest_max_guests: maxGuests,
      })
    : await supabaseClient.rpc("create_guest_with_invite", {
        guest_name: name,
        guest_invite_type: inviteType,
        guest_couple_members: coupleMembers,
        guest_max_guests: maxGuests,
      });

  if (result.error) {
    console.error(result.error);
    showAdminToast(
      editingGuest
        ? "⚠️ Erro ao atualizar convidado."
        : "⚠️ Erro ao criar convidado.",
    );
    return;
  }

  closeGuestModal();
  showAdminToast(
    editingGuest
      ? "💜 Convidado atualizado com sucesso!"
      : "💜 Convidado criado com sucesso!",
  );
  editingGuest = null;
  await loadGuestsAdmin();
});

adminRSVPForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedRSVPGuest) {
    return;
  }

  const wasEditingRSVP = Boolean(selectedExistingRSVP);
  const isCoupleInvite = selectedRSVPGuest.invite_type === "couple";
  let members = [];
  let finalPresence = adminRSVPPresenceInput.value;

  if (isCoupleInvite) {
    members = (selectedRSVPGuest.couple_members || []).map((member, index) => {
      const presence =
        document.querySelector(
          `.admin-rsvp-member-presence[data-index="${index}"]`,
        )?.value || "Não";

      return {
        name: member.name,
        presence,
      };
    });

    finalPresence = members.some((member) => member.presence === "Sim")
      ? "Sim"
      : "Não";
  }

  let guestCount = Number(adminRSVPGuestCountInput.value || 0);
  let companions = getAdminRSVPCompanions();

  if (finalPresence === "Não") {
    guestCount = 0;
    companions = [];
  }

  const payload = {
    guest_id: selectedRSVPGuest.id,
    presence: finalPresence,
    email: adminRSVPEmailInput.value || "",
    phone: adminRSVPPhoneInput.value || "",
    food: adminRSVPFoodInput.value || "",
    message: adminRSVPMessageInput.value || "",
    updated_at: new Date().toISOString(),
    guest_data: {
      name: selectedRSVPGuest.name,
      email: adminRSVPEmailInput.value || "",
      phone: adminRSVPPhoneInput.value || "",
      guest_count: guestCount,
      members,
      companions,
    },
  };

  const result = await supabaseClient.rpc("save_admin_rsvp", {
    target_guest_id: selectedRSVPGuest.id,
    submitted_email: payload.email,
    submitted_food: payload.food,
    submitted_guest_data: payload.guest_data,
    submitted_message: payload.message,
    submitted_phone: payload.phone,
    submitted_presence: payload.presence,
  });

  if (result.error) {
    console.error(result.error);
    showAdminToast("⚠️ Erro ao salvar RSVP.");
    return;
  }

  closeAdminRSVPModal();
  showAdminToast(
    wasEditingRSVP
      ? "💜 RSVP atualizado com sucesso!"
      : "💜 RSVP criado com sucesso!",
  );
  await loadGuestsAdmin();
});

deleteAdminRSVPButton.addEventListener("click", async () => {
  if (!selectedExistingRSVP || !selectedRSVPGuest) {
    return;
  }

  const confirmed = confirm("Deseja remover esta confirmação de presença?");

  if (!confirmed) {
    return;
  }

  const { error } = await supabaseClient.rpc("delete_admin_rsvp", {
    target_rsvp_id: selectedExistingRSVP.id,
  });

  if (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao remover RSVP.");
    return;
  }

  closeAdminRSVPModal();
  showAdminToast("💜 RSVP removido com sucesso!");
  await loadGuestsAdmin();
});

openGuestModalButton.addEventListener("click", openGuestModal);
closeGuestModalButton.addEventListener("click", closeGuestModal);
closeGuestDetailsModalButton.addEventListener("click", () => {
  closeGuestDetailsModal();
});
closeAdminRSVPModalButton.addEventListener("click", closeAdminRSVPModal);

[
  guestSearchInput,
  guestStatusFilter,
  guestConfirmedFilter,
  guestTypeFilter,
].forEach((filter) => {
  filter?.addEventListener("input", applyGuestFilters);
  filter?.addEventListener("change", applyGuestFilters);
});

clearGuestFiltersButton?.addEventListener("click", clearGuestFilters);
exportGuestsButton?.addEventListener("click", exportGuestsCSV);

document.querySelectorAll("[data-guest-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    setGuestSort(button.dataset.guestSort);
  });
});

guestInviteTypeInput.addEventListener("change", () => {
  coupleFields.style.display =
    guestInviteTypeInput.value === "couple" ? "block" : "none";
});

guestModal.addEventListener("click", (event) => {
  if (event.target === guestModal) {
    closeGuestModal();
  }
});

guestDetailsModal.addEventListener("click", (event) => {
  if (event.target === guestDetailsModal) {
    closeGuestDetailsModal();
  }
});

adminRSVPModal.addEventListener("click", (event) => {
  if (event.target === adminRSVPModal) {
    closeAdminRSVPModal();
  }
});

adminRSVPGuestCountInput.addEventListener("change", () => {
  cachedAdminRSVPCompanions = getAdminRSVPCompanions();
  renderAdminRSVPCompanionFields(cachedAdminRSVPCompanions);
});

adminRSVPPresenceInput.addEventListener("change", () => {
  if (adminRSVPPresenceInput.value === "Não") {
    hideAdminRSVPCompanions();
  } else {
    showAdminRSVPCompanionsIfAllowed();
  }
});

if (adminRSVPPhoneInput) {
  maskPhoneInput(adminRSVPPhoneInput);
}

applyGuestFiltersFromUrl();
loadGuestsAdmin();
