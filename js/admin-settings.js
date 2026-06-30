AdminCommon.setupLogout();

const showAdminToast = AdminCommon.showToast;

const settingsForm = document.getElementById("settingsForm");
const pixKeyInput = document.getElementById("pixKeyInput");
const merchantNameInput = document.getElementById("merchantNameInput");
const merchantCityInput = document.getElementById("merchantCityInput");
const whatsappNumberInput = document.getElementById("whatsappNumberInput");
const buffetPayingAgeInput = document.getElementById(
  "buffetPayingAgeInput",
);

let currentSettingsId = null;

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidBrazilianWhatsapp(value) {
  return /^55\d{10,11}$/.test(value);
}

function fillSettingsForm(settings) {
  currentSettingsId = settings?.id || null;
  pixKeyInput.value = settings?.pix_key || "";
  merchantNameInput.value = settings?.merchant_name || "";
  merchantCityInput.value = settings?.merchant_city || "";
  whatsappNumberInput.value = settings?.whatsapp_number || "";
  buffetPayingAgeInput.value = settings?.buffet_paying_age || 7;
}

async function loadSettings() {
  const { data, error } = await supabaseClient
    .from("settings")
    .select(
      "id, pix_key, merchant_name, merchant_city, whatsapp_number, buffet_paying_age",
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    showAdminToast("⚠️ Erro ao carregar configurações.");
    return;
  }

  fillSettingsForm(data);
}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    pix_key: pixKeyInput.value.trim(),
    merchant_name: merchantNameInput.value.trim(),
    merchant_city: merchantCityInput.value.trim(),
    whatsapp_number: normalizePhone(whatsappNumberInput.value),
    buffet_paying_age: Number.parseInt(buffetPayingAgeInput.value, 10),
  };

  if (
    !payload.pix_key ||
    !payload.merchant_name ||
    !payload.merchant_city
  ) {
    showAdminToast("⚠️ Preencha todos os dados necessários para o PIX.");
    return;
  }

  if (!isValidBrazilianWhatsapp(payload.whatsapp_number)) {
    showAdminToast("⚠️ Informe o WhatsApp no formato 55 + DDD + número.");
    return;
  }

  if (
    !Number.isInteger(payload.buffet_paying_age) ||
    payload.buffet_paying_age < 1 ||
    payload.buffet_paying_age > 18
  ) {
    showAdminToast("⚠️ Informe uma idade mínima pagante entre 1 e 18 anos.");
    return;
  }

  const result = currentSettingsId
    ? await supabaseClient
        .from("settings")
        .update(payload)
        .eq("id", currentSettingsId)
    : await supabaseClient
        .from("settings")
        .insert([payload])
        .select("id")
        .single();

  if (result.error) {
    console.error(result.error);
    showAdminToast("⚠️ Erro ao salvar configurações.");
    return;
  }

  if (!currentSettingsId) {
    currentSettingsId = result.data?.id || null;
  }

  showAdminToast("💜 Configurações salvas com sucesso!");
});

loadSettings();
