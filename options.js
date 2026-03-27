document.addEventListener("DOMContentLoaded", async () => {
  const { getSyncSettings, saveSyncSettings, bindTranslations, getLocaleText } = window.CalculatorApp;

  const form = document.getElementById("settingsForm");
  const language = document.getElementById("language");
  const historyEnabled = document.getElementById("historyEnabled");
  const historyLimit = document.getElementById("historyLimit");
  const saveStatus = document.getElementById("saveStatus");
  const backButton = document.getElementById("backButton");
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") || "large";
  const returnTo = params.get("returnTo") || (view === "popup" ? "popup.html" : "large.html");

  let settings = await getSyncSettings();

  function applyTranslations() {
    document.documentElement.lang = settings.language;
    bindTranslations(document, settings.language);
    saveStatus.textContent = "";
  }

  function syncForm() {
    language.value = settings.language;
    historyEnabled.checked = settings.historyEnabled;
    historyLimit.value = `${settings.historyLimit}`;
  }

  async function persistSettings() {
    settings = {
      language: language.value,
      historyEnabled: historyEnabled.checked,
      historyLimit: Number.parseInt(historyLimit.value, 10)
    };

    await saveSyncSettings(settings);
    applyTranslations();
    saveStatus.textContent = getLocaleText(settings.language, "saveStatus");
    window.setTimeout(() => {
      saveStatus.textContent = "";
    }, 1600);
  }

  form.addEventListener("change", persistSettings);
  backButton.addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL(returnTo);
  });

  document.body.dataset.view = view;
  syncForm();
  applyTranslations();
});
