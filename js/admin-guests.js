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
const inviteMessageModal = document.getElementById("inviteMessageModal");
const closeInviteMessageModalButton = document.getElementById(
  "closeInviteMessageModalButton",
);
const inviteMessageText = document.getElementById("inviteMessageText");
const copyInviteMessageButton = document.getElementById(
  "copyInviteMessageButton",
);
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function getCachedGuestById(guestId) {
  return cachedGuests.find((guest) => String(guest.id) === String(guestId));
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
  const badge = document.createElement("span");

  if (type === "couple") {
    badge.className = "admin-badge badge-payment";
    badge.textContent = "Casal";
    return badge;
  }

  badge.className = "admin-badge badge-muted";
  badge.textContent = "Individual";
  return badge;
}

function createStatusBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = `admin-badge ${className}`;
  badge.textContent = text;
  return badge;
}

function createAdminIcon(name) {
  const icons = {
    clipboard: ["M8 5h8", "M9 3h6v4H9z", "M7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1"],
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
    eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"],
    power: ["M12 2v10", "M18.4 6.6a9 9 0 1 1-12.8 0"],
    rsvp: ["M4 5h16v14H4z", "m4 7 8 6 8-6"],
    message: ["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z", "M8 9h8M8 13h5"],
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  (icons[name] || []).forEach((pathData) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
  });

  if (name === "eye") {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "3");
    svg.appendChild(circle);
  }

  return svg;
}

function createIconButton(className, iconName, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.append(createAdminIcon(iconName), document.createTextNode(` ${label}`));
  return button;
}

function renderGuestActions(guest) {
  const actions = document.createElement("div");
  actions.className = "admin-actions compact-actions";

  const detailsButton = createIconButton("admin-action-button icon-action", "eye", "Detalhes");
  detailsButton.title = "Ver detalhes";
  detailsButton.addEventListener("click", () => {
    window.openGuestDetailsModal(guest);
  });

  const editButton = createIconButton("admin-action-button icon-action", "edit", "Editar");
  editButton.title = "Editar convidado";
  editButton.addEventListener("click", () => {
    window.openEditGuestModal(guest);
  });

  actions.append(detailsButton, editButton);
  return actions;
}

function renderGuestCoupleMembers(guest) {
  const members = guest.couple_members || [];

  if (guest.invite_type !== "couple" || !members.length) {
    return null;
  }

  const section = createDetailsSection("Casal");
  const list = document.createElement("div");
  list.className = "admin-details-list";

  members.forEach((member) => {
    const item = document.createElement("div");
    item.className = "admin-details-item";

    const content = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = member.name || "Sem nome";
    content.appendChild(name);
    item.appendChild(content);
    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

function renderGuestInviteMeta(guest) {
  const items = [
    ["Código", guest.invite_code || "-"],
    ["Acompanhantes", guest.max_guests || 0],
    ["Último acesso", formatDate(guest.last_access)],
    ["Acessos", guest.access_count || 0],
  ];

  const grid = document.createElement("div");
  grid.className = "admin-details-meta-grid";

  items.forEach(([label, value], index) => {
    const item = document.createElement("div");
    item.className = "admin-details-meta-item";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement(index === 0 ? "code" : "strong");
    valueElement.textContent = String(value);

    item.append(labelElement, valueElement);
    grid.appendChild(item);
  });

  return grid;
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

function createDetailsSection(label) {
  const section = document.createElement("section");
  section.className = "admin-details-section";

  const labelElement = document.createElement("span");
  labelElement.className = "admin-details-label";
  labelElement.textContent = label;
  section.appendChild(labelElement);

  return section;
}

function createDetailActionCard({ className = "", icon, title, description, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `admin-detail-action-card ${className}`.trim();

  const iconWrapper = document.createElement("span");
  iconWrapper.className = "admin-detail-action-icon";
  iconWrapper.appendChild(createAdminIcon(icon));

  const textWrapper = document.createElement("span");
  const titleElement = document.createElement("strong");
  titleElement.textContent = title;
  const descriptionElement = document.createElement("small");
  descriptionElement.textContent = description;
  textWrapper.append(titleElement, descriptionElement);

  button.append(iconWrapper, textWrapper);
  button.addEventListener("click", onClick);
  return button;
}

function renderGuestDetailsActions(guest) {
  const activeActionLabel = guest.active
    ? "Desativar convidado"
    : "Ativar convidado";
  const activeActionDescription = guest.active
    ? "Impede o acesso do convite sem remover o cadastro."
    : "Reativa o acesso deste convite.";

  const grid = document.createElement("div");
  grid.className = "admin-detail-action-grid";

  grid.append(
    createDetailActionCard({
      icon: "edit",
      title: "Editar convidado",
      description: "Altera nome, tipo de convite, acompanhantes e permissão.",
      onClick: () => {
        closeGuestDetailsModal();
        window.openEditGuestModal(guest);
      },
    }),
    createDetailActionCard({
      className: guest.active ? "danger" : "success",
      icon: "power",
      title: activeActionLabel,
      description: activeActionDescription,
      onClick: () => {
        closeGuestDetailsModal();
        toggleGuestActive(guest.id, !guest.active);
      },
    }),
    createDetailActionCard({
      icon: "message",
      title: "Criar mensagem",
      description: "Gera um texto personalizado para enviar ao convidado.",
      onClick: () => {
        window.openInviteMessageModal(guest);
      },
    }),
    createDetailActionCard({
      icon: "clipboard",
      title: "Copiar código",
      description: "Copia o código de acesso deste convite.",
      onClick: () => {
        copyInviteCode(guest.invite_code);
      },
    }),
    createDetailActionCard({
      icon: "rsvp",
      title: "RSVP manual",
      description: "Cria ou atualiza a confirmação de presença.",
      onClick: () => {
        closeGuestDetailsModal();
        openAdminRSVPModal(guest);
      },
    }),
  );

  return grid;
}

window.openGuestDetailsModal = function (guest) {
  guestDetailsTitle.textContent = guest.name || "Detalhes do Convidado";

  const summarySection = createDetailsSection("Resumo");
  const situationStack = document.createElement("div");
  situationStack.className = "guest-situation-stack";
  situationStack.append(
    renderInviteTypeBadge(guest.invite_type),
    guest.confirmed
      ? createStatusBadge("RSVP confirmado", "badge-available")
      : createStatusBadge("RSVP pendente", "badge-muted"),
    guest.active
      ? createStatusBadge("Ativo", "badge-available")
      : createStatusBadge("Inativo", "badge-danger"),
  );
  summarySection.appendChild(situationStack);

  const actionsSection = createDetailsSection("Ações");
  actionsSection.appendChild(renderGuestDetailsActions(guest));

  const inviteSection = createDetailsSection("Convite");
  inviteSection.appendChild(renderGuestInviteMeta(guest));

  const coupleSection = renderGuestCoupleMembers(guest);
  const sections = [summarySection, actionsSection, inviteSection];

  if (coupleSection) {
    sections.push(coupleSection);
  }

  guestDetailsContent.replaceChildren(...sections);

  guestDetailsModal.classList.add("active");
};

window.openGuestDetailsModalById = function (guestId) {
  const guest = getCachedGuestById(guestId);

  if (!guest) {
    showAdminToast("⚠️ Convidado não encontrado.");
    return;
  }

  window.openGuestDetailsModal(guest);
};

window.closeGuestDetailsModal = function () {
  guestDetailsModal.classList.remove("active");
};

function formatInviteTime(time) {
  const [hours, minutes] = String(time || "").split(":");
  return minutes === "00" ? `${hours}h` : `${hours}h${minutes}`;
}

function getInvitationSiteUrl() {
  return new URL("./", window.location.href).href;
}

function buildInviteMessage(guest) {
  const { celebration, venue } = EventConfig;
  const isCouple = guest.invite_type === "couple";
  const invitationText = isCouple
    ? "Vocês estão convidados(as)"
    : "Você está convidado(a)";
  const confirmationInstruction = isCouple
    ? "acessem o site, toquem em “Confirmar presença”, informem o código de convite e preencham a confirmação"
    : "acesse o site, toque em “Confirmar presença”, informe o código de convite e preencha a confirmação";
  const confirmationRequest = isCouple ? "confirmem" : "confirme";
  const accessInstruction = isCouple ? "entrem" : "entre";
  const codeInstruction = isCouple ? "Usem" : "Use";
  const closingText = isCouple ? "Eu espero vocês" : "Eu espero você";
  const eventDate = EventConfig.formatDate(celebration.date, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const deadline = EventConfig.formatDate(celebration.rsvpDeadline, {
    day: "2-digit",
    month: "long",
  });

  return `Oi, ${guest.name}! 💜\n\n${invitationText} para comemorar o meu aniversário! 🎉\n\n📅 ${eventDate}, às ${formatInviteTime(celebration.time)}\n📍 ${venue.name} — ${venue.address}, ${venue.city}/${venue.state}\n\nPara acessar o convite e confirmar a presença, ${accessInstruction} em:\n${getInvitationSiteUrl()}\n\n${codeInstruction} o código de convite: ${guest.invite_code}\n\nÉ bem rapidinho: ${confirmationInstruction}. Peço que ${confirmationRequest} até ${deadline}.\n\n${closingText}! ✨💜`;
}

window.openInviteMessageModal = function (guest) {
  inviteMessageText.value = buildInviteMessage(guest);
  inviteMessageModal.classList.add("active");
  inviteMessageText.focus();
};

function closeInviteMessageModal() {
  inviteMessageModal.classList.remove("active");
}

async function copyInviteMessage() {
  try {
    await navigator.clipboard.writeText(inviteMessageText.value);
    showAdminToast("💜 Mensagem copiada! Agora é só enviar.");
  } catch (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao copiar mensagem.");
  }
}

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
  guestsTableBody.replaceChildren();

  if (!guests.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9;
    cell.className = "admin-empty-state";
    cell.textContent = "Nenhum convidado encontrado para os filtros selecionados.";
    row.appendChild(cell);
    guestsTableBody.appendChild(row);
    return;
  }

  guests.forEach((guest) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = guest.name || "-";

    const typeCell = document.createElement("td");
    typeCell.appendChild(renderInviteTypeBadge(guest.invite_type));

    const companionsCell = document.createElement("td");
    companionsCell.textContent = String(guest.max_guests || 0);

    const confirmedCell = document.createElement("td");
    confirmedCell.appendChild(
      guest.confirmed
        ? createStatusBadge("Sim", "badge-available")
        : createStatusBadge("Não", "badge-muted"),
    );

    const activeCell = document.createElement("td");
    activeCell.appendChild(
      guest.active
        ? createStatusBadge("Ativo", "badge-available")
        : createStatusBadge("Inativo", "badge-danger"),
    );

    const codeCell = document.createElement("td");
    const codeButton = document.createElement("button");
    codeButton.type = "button";
    codeButton.className = "admin-code-button";
    codeButton.title = "Copiar código";
    codeButton.setAttribute("aria-label", `Copiar código ${guest.invite_code || ""}`);
    codeButton.addEventListener("click", () => {
      copyInviteCode(guest.invite_code);
    });

    const code = document.createElement("code");
    code.textContent = guest.invite_code || "-";
    codeButton.appendChild(code);
    codeCell.appendChild(codeButton);

    const lastAccessCell = document.createElement("td");
    lastAccessCell.textContent = formatDate(guest.last_access);

    const accessCountCell = document.createElement("td");
    accessCountCell.textContent = String(guest.access_count || 0);

    const actionsCell = document.createElement("td");
    actionsCell.appendChild(renderGuestActions(guest));

    row.append(
      nameCell,
      typeCell,
      companionsCell,
      confirmedCell,
      activeCell,
      codeCell,
      lastAccessCell,
      accessCountCell,
      actionsCell,
    );

    guestsTableBody.appendChild(row);
  });
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
  adminRSVPGuestCountInput.replaceChildren();

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
  adminRSVPGuestFields.replaceChildren();

  const count = Number(adminRSVPGuestCountInput.value || 0);

  for (let i = 1; i <= count; i++) {
    const companion = companions[i - 1] || {};
    const wrapper = document.createElement("div");

    wrapper.classList.add("admin-rsvp-companion-card");
    const title = document.createElement("h4");
    title.textContent = `Acompanhante ${i}`;

    const nameGroup = document.createElement("div");
    nameGroup.className = "admin-form-group";

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Nome";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "admin-rsvp-companion-name";
    nameInput.dataset.index = String(i);
    nameInput.value = companion.name || "";
    nameInput.required = true;
    nameGroup.append(nameLabel, nameInput);

    const childGroup = document.createElement("div");
    childGroup.className = "admin-form-group";

    const childLabel = document.createElement("label");
    childLabel.textContent = "É criança?";

    const childSelect = document.createElement("select");
    childSelect.className = "admin-rsvp-companion-child";
    childSelect.dataset.index = String(i);

    ["Não", "Sim"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = companion.is_child === value;
      childSelect.appendChild(option);
    });

    childGroup.append(childLabel, childSelect);
    wrapper.append(title, nameGroup, childGroup);

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
  adminRSVPGuestFields.replaceChildren();
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
  adminRSVPGuestFields.replaceChildren();
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

    adminRSVPCoupleMembers.replaceChildren();

    members.forEach((member, index) => {
      const existingPresence = existingMembers[index]?.presence || "Sim";
      const group = document.createElement("div");
      group.className = "admin-form-group";

      const label = document.createElement("label");
      label.textContent = member.name || `Pessoa ${index + 1}`;

      const select = document.createElement("select");
      select.className = "admin-rsvp-member-presence";
      select.dataset.index = String(index);

      ["Sim", "Não"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = existingPresence === value;
        select.appendChild(option);
      });

      select.addEventListener("change", updateAdminRSVPCoupleCompanionVisibility);
      group.append(label, select);
      adminRSVPCoupleMembers.appendChild(group);
    });
  } else {
    adminRSVPPresenceGroup.style.display = "block";
    adminRSVPCoupleMembers.style.display = "none";
    adminRSVPCoupleMembers.replaceChildren();
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

closeInviteMessageModalButton.addEventListener("click", closeInviteMessageModal);
copyInviteMessageButton.addEventListener("click", copyInviteMessage);
inviteMessageModal.addEventListener("click", (event) => {
  if (event.target === inviteMessageModal) {
    closeInviteMessageModal();
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
