const guest = window.currentGuest;
PublicCommon.setupNavbar();
PublicCommon.setupLogout();
PublicCommon.showGuestName(guest);

const form = document.getElementById("rsvpForm");
const guestCount = document.getElementById("guestCount");
const guestFields = document.getElementById("guestFields");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

let existingRSVP = null;
let cachedCompanions = [];

/* =========================
   Auto Fill
========================= */

document.querySelector('input[name="name"]').value = guest.name || "";

document.querySelector('input[name="name"]').readOnly = true;

document.querySelector('input[name="email"]').value = "";

/* =========================
   Invite Type
========================= */

const isCoupleInvite = guest.invite_type === "couple";

const messageField = document.querySelector('textarea[name="message"]');

if (messageField) {
  messageField.placeholder = isCoupleInvite
    ? "Se quiserem, deixem uma mensagem carinhosa para nós 💜"
    : "Se quiser, deixe uma mensagem carinhosa para nós 💜";
}

const coupleMembersSection = document.getElementById("coupleMembersSection");

const coupleMembersFields = document.getElementById("coupleMembersFields");

const presenceGroup = document
  .querySelector('input[name="presence"]')
  ?.closest(".form-group");

const guestCountGroup = document
  .getElementById("guestCount")
  ?.closest(".form-group");

/* =========================
   Guest Limit
========================= */

guestCount.innerHTML = "";

for (let i = 0; i <= (guest.max_guests || 0); i++) {
  const option = document.createElement("option");

  option.value = i;
  option.textContent = i;

  guestCount.appendChild(option);
}

if (guestCountGroup) {
  guestCountGroup.style.display = "none";
}

/* =========================
   Toast
========================= */

function showToast(message) {
  toastMessage.innerText = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

/* =========================
   Companion Fields
========================= */

guestCount.addEventListener("change", () => {
  guestFields.innerHTML = "";

  const count = parseInt(guestCount.value || 0);

  for (let i = 1; i <= count; i++) {
    const wrapper = document.createElement("div");

    wrapper.classList.add("guest-card");

    wrapper.innerHTML = `
      <h4>
        Acompanhante ${i}
      </h4>

      <div class="form-group">
        <label>
          Nome
        </label>

        <input
          type="text"
          name="guest_name_${i}"
          required
        >
      </div>

      <div class="form-group">
        <label>
          É criança?
        </label>

        <select
          class="child-select"
          data-index="${i}"
          name="guest_child_${i}"
        >
          <option value="Não">
            Não
          </option>

          <option value="Sim">
            Sim
          </option>
        </select>
      </div>

      <div
        class="form-group child-age is-hidden"
        id="childAge_${i}"
      >
        <label>
          Idade da criança na data da festa
        </label>

        <select
          class="child-age-select"
          name="guest_age_${i}"
        >
          ${ChildAgeOptions.renderOptions()}
        </select>

        <small class="field-help">
          Considere a idade que a criança terá em 8 de agosto de 2026.
        </small>
      </div>
    `;

    guestFields.appendChild(wrapper);
  }

  activateChildLogic();
});

function activateChildLogic() {
  document.querySelectorAll(".child-select").forEach((select) => {
    select.addEventListener("change", () => {
      const index = select.dataset.index;

      const ageField = document.getElementById(`childAge_${index}`);
      const ageSelect = ageField.querySelector(".child-age-select");
      const isChild = select.value === "Sim";

      ageField.style.display = isChild ? "block" : "none";
      ageSelect.required = isChild;

      if (!isChild) {
        ageSelect.value = "";
      }
    });
  });
}

/* =========================
   Companion Cache
========================= */

function getCurrentCompanionsFromForm() {
  const companions = [];

  const count = parseInt(guestCount.value || 0);

  for (let i = 1; i <= count; i++) {
    companions.push({
      name:
        document.querySelector(`input[name="guest_name_${i}"]`)?.value || "",

      is_child:
        document.querySelector(`select[name="guest_child_${i}"]`)?.value ||
        "Não",

      age: document.querySelector(`select[name="guest_age_${i}"]`)?.value || "",
    });
  }

  return companions;
}

function restoreCompanions(companions) {
  if (!companions.length) {
    return;
  }

  guestCount.value = companions.length;

  guestCount.dispatchEvent(new Event("change"));

  companions.forEach((companion, index) => {
    const i = index + 1;

    document.querySelector(`input[name="guest_name_${i}"]`).value =
      companion.name || "";

    document.querySelector(`select[name="guest_child_${i}"]`).value =
      companion.is_child || "Não";

    if (companion.is_child === "Sim") {
      document.getElementById(`childAge_${i}`).style.display = "block";

      const ageSelect = document.querySelector(
        `select[name="guest_age_${i}"]`,
      );
      ageSelect.innerHTML = ChildAgeOptions.renderOptions(companion.age);
      ageSelect.required = true;
    }
  });
}

function hideCompanions(keepCache = true) {
  if (keepCache) {
    const currentCompanions = getCurrentCompanionsFromForm();

    if (currentCompanions.length > 0) {
      cachedCompanions = currentCompanions;
    }
  }

  if (guestCountGroup) {
    guestCountGroup.style.display = "none";
  }

  guestCount.value = 0;
  guestFields.innerHTML = "";
}

function showCompanionsIfAllowed({ restoreCached = true } = {}) {
  if (!guestCountGroup) {
    return;
  }

  if ((guest.max_guests || 0) <= 0) {
    return;
  }

  guestCountGroup.style.display = "block";

  if (
    restoreCached &&
    cachedCompanions.length > 0 &&
    guestFields.children.length === 0
  ) {
    restoreCompanions(cachedCompanions);
  }
}

/* =========================
   Individual Invite Logic
========================= */

if (!isCoupleInvite) {
  document.querySelectorAll('input[name="presence"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.value === "Não" && input.checked) {
        hideCompanions();
      }

      if (input.value === "Sim" && input.checked) {
        showCompanionsIfAllowed();
      }
    });
  });
}

/* =========================
   Couple Invite Logic
========================= */

function updateCoupleCompanionVisibility() {
  if (!isCoupleInvite) {
    return;
  }

  const members = guest.couple_members || [];

  const someoneIsComing = members.some((member, index) => {
    const selected = document.querySelector(
      `input[name="couple_member_${index}"]:checked`,
    );

    return selected?.value === "Sim";
  });

  if (someoneIsComing) {
    showCompanionsIfAllowed();
  } else {
    hideCompanions();
  }
}

function setupCoupleInvite() {
  if (!isCoupleInvite) {
    return;
  }

  if (coupleMembersSection) {
    coupleMembersSection.style.display = "block";
  }

  if (presenceGroup) {
    presenceGroup.style.display = "none";
  }

  document.querySelectorAll('input[name="presence"]').forEach((input) => {
    input.required = false;
  });

  const members = guest.couple_members || [];

  coupleMembersFields.innerHTML = members
    .map(
      (member, index) => `
        <div class="couple-member-card">

          <strong>
            ${member.name}
          </strong>

          <div class="radio-group">

            <label>
              <input
                type="radio"
                name="couple_member_${index}"
                value="Sim"
                required
              >
              Sim
            </label>

            <label>
              <input
                type="radio"
                name="couple_member_${index}"
                value="Não"
                required
              >
              Não
            </label>

          </div>

        </div>
      `,
    )
    .join("");

  document
    .querySelectorAll('input[name^="couple_member_"]')
    .forEach((input) => {
      input.addEventListener("change", updateCoupleCompanionVisibility);
    });

  hideCompanions(false);
}

setupCoupleInvite();

/* =========================
   Load Existing RSVP
========================= */

async function loadExistingRSVP() {
  const { data, error } = await GuestData.loadRSVP(guest.id);

  if (error) {
    console.error(error);
    showToast("⚠️ Erro ao carregar sua confirmação.");
    return;
  }

  existingRSVP = data;

  if (!existingRSVP) {
    return;
  }

  document.querySelector('input[name="email"]').value =
    existingRSVP.email || "";

  document.querySelector('input[name="phone"]').value =
    existingRSVP.phone || "";

  if (isCoupleInvite) {
    const members = existingRSVP.guest_data?.members || [];

    members.forEach((member, index) => {
      const radio = document.querySelector(
        `input[name="couple_member_${index}"][value="${member.presence}"]`,
      );

      if (radio) {
        radio.checked = true;
      }
    });

    updateCoupleCompanionVisibility();
  } else {
    if (existingRSVP.presence) {
      const presenceInput = document.querySelector(
        `input[name="presence"][value="${existingRSVP.presence}"]`,
      );

      if (presenceInput) {
        presenceInput.checked = true;
      }

      if (existingRSVP.presence === "Sim") {
        showCompanionsIfAllowed();
      } else {
        hideCompanions(false);
      }
    }
  }

  document.querySelector('input[name="food"]').value = existingRSVP.food || "";

  document.querySelector('textarea[name="message"]').value =
    existingRSVP.message || "";

  const companions = existingRSVP.guest_data?.companions || [];

  cachedCompanions = companions;

  const shouldLoadCompanions =
    companions.length > 0 &&
    (!isCoupleInvite ||
      existingRSVP.guest_data?.members?.some(
        (member) => member.presence === "Sim",
      ));

  if (shouldLoadCompanions) {
    showCompanionsIfAllowed({ restoreCached: false });

    restoreCompanions(companions);
  }

  form.querySelector("button").innerText = "Atualizar confirmação";
}

/* =========================
   Submit
========================= */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const button = form.querySelector("button");
  const wasEditing = Boolean(existingRSVP);

  button.innerText = "Enviando confirmação...";
  button.classList.add("loading");
  button.disabled = true;

  try {
    const formData = new FormData(form);

    const data = {};

    formData.forEach((value, key) => {
      data[key] = value;
    });

    const companions = [];

    const count = parseInt(data.guestCount || 0);

    for (let i = 1; i <= count; i++) {
      companions.push({
        name: data[`guest_name_${i}`] || "",

        is_child: data[`guest_child_${i}`] || "Não",

        age: data[`guest_age_${i}`] || "",
      });
    }

    let coupleMembers = [];

    if (isCoupleInvite) {
      coupleMembers = (guest.couple_members || []).map((member, index) => ({
        name: member.name,

        presence: data[`couple_member_${index}`] || "Não",
      }));
    }

    let finalPresence = data.presence;

    if (isCoupleInvite) {
      const someoneIsComing = coupleMembers.some(
        (member) => member.presence === "Sim",
      );

      finalPresence = someoneIsComing ? "Sim" : "Não";
    }

    if (!isCoupleInvite && finalPresence === "Não") {
      data.guestCount = 0;
      companions.length = 0;
    }

    if (isCoupleInvite) {
      const coupleSomeoneIsComing = coupleMembers.some(
        (member) => member.presence === "Sim",
      );

      if (!coupleSomeoneIsComing) {
        data.guestCount = 0;
        companions.length = 0;
      }
    }

    const rsvpPayload = {
      guest_id: guest.id,

      presence: finalPresence,

      email: data.email || "",

      phone: data.phone || "",

      food: data.food || "",

      message: data.message || "",

      updated_at: new Date().toISOString(),

      guest_data: {
        name: data.name,

        email: data.email || "",

        phone: data.phone || "",

        guest_count: Number(data.guestCount || 0),

        members: coupleMembers,

        companions,
      },
    };

    const result = await GuestData.saveRSVP(existingRSVP, rsvpPayload);
    const error = result.error;

    if (!error) {
      existingRSVP = result.data;
    }

    if (error) {
      throw error;
    }

    const { error: guestError } = await GuestData.markGuestConfirmed(guest);

    if (guestError) {
      console.error(guestError);
    }

    document.getElementById("successMessage").style.display = "block";

    button.innerText = "Atualizar confirmação";

    showToast(
      wasEditing
        ? "💜 Confirmação atualizada com sucesso!"
        : "💜 Presença confirmada com sucesso!",
    );
  } catch (error) {
    console.error(error);

    showToast("⚠️ Não foi possível enviar sua confirmação.");
  } finally {
    button.classList.remove("loading");
    button.disabled = false;
  }
});

/* =========================
   Mobile Menu
========================= */

/* =========================
   Phone Mask
========================= */

const phoneInput = document.getElementById("phone");

if (phoneInput) {
  phoneInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");

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

    e.target.value = value;
  });
}

/* =========================
   Init
========================= */

loadExistingRSVP();
