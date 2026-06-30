AdminCommon.setupLogout();

const settingsForm = document.getElementById("settingsForm");
const buffetPayingAgeInput = document.getElementById("buffetPayingAgeInput");
let currentSettingsId = null;

async function loadSettings() {
  const { data, error } = await supabaseClient.from("settings").select("id, buffet_paying_age").limit(1).maybeSingle();
  if (error) return AdminCommon.showToast("⚠️ Erro ao carregar configurações.");
  currentSettingsId = data?.id || null;
  buffetPayingAgeInput.value = data?.buffet_paying_age || 7;
}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const age = Number.parseInt(buffetPayingAgeInput.value, 10);
  if (!Number.isInteger(age) || age < 1 || age > 18) return AdminCommon.showToast("⚠️ Informe uma idade entre 1 e 18 anos.");
  const result = currentSettingsId
    ? await supabaseClient.from("settings").update({ buffet_paying_age: age }).eq("id", currentSettingsId)
    : await supabaseClient.from("settings").insert({ buffet_paying_age: age }).select("id").single();
  if (result.error) return AdminCommon.showToast("⚠️ Erro ao salvar configurações.");
  currentSettingsId ||= result.data?.id || null;
  AdminCommon.showToast("💜 Configuração salva com sucesso!");
});

loadSettings();
