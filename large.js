document.addEventListener("DOMContentLoaded", async () => {
  const {
    CalculatorEngine,
    getSyncSettings,
    getHistory,
    saveHistoryItem,
    clearHistory,
    bindTranslations,
    getLocaleText
  } = window.CalculatorApp;

  const display = document.getElementById("display");
  const expression = document.getElementById("expression");
  const historyList = document.getElementById("historyList");
  const clearHistoryButton = document.getElementById("clearHistory");
  const openOptionsButton = document.getElementById("openOptions");

  let settings = await getSyncSettings();
  let historyCache = await getHistory();

  const engine = new CalculatorEngine(async (item) => {
    if (!settings.historyEnabled) {
      return;
    }

    historyCache = await saveHistoryItem(item, settings.historyLimit);
    renderHistory();
  });

  function localizeDisplayValue(value) {
    if (value === "Error") {
      return getLocaleText(settings.language, "error");
    }

    return settings.language === "uk" ? value.replace(".", ",") : value;
  }

  function syncView() {
    const state = engine.getState();
    display.textContent = localizeDisplayValue(state.displayValue);
    expression.textContent = state.expression || "0";
  }

  function renderHistory() {
    historyList.innerHTML = "";

    if (!settings.historyEnabled || historyCache.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "history-empty";
      emptyState.textContent = settings.historyEnabled
        ? getLocaleText(settings.language, "noHistory")
        : getLocaleText(settings.language, "historyDisabled");
      historyList.appendChild(emptyState);
      return;
    }

    historyCache.slice(0, settings.historyLimit).forEach((item) => {
      const button = document.createElement("button");
      button.className = "history-item";
      button.type = "button";
      button.innerHTML = `
        <p class="history-expression">${item.expression}</p>
        <p class="history-result">${localizeDisplayValue(item.result)}</p>
      `;
      button.addEventListener("click", () => {
        engine.restore(item.result, item.expression);
        syncView();
      });
      historyList.appendChild(button);
    });
  }

  function handleAction(action, value) {
    switch (action) {
      case "digit":
        engine.inputDigit(value);
        break;
      case "decimal":
        engine.inputDecimal();
        break;
      case "operator":
        engine.setOperator(value);
        break;
      case "equals":
        engine.calculate();
        break;
      case "clear":
        engine.clearAll();
        break;
      case "delete":
        engine.backspace();
        break;
      case "sign":
        engine.toggleSign();
        break;
      case "percent":
        engine.percent();
        break;
      default:
        break;
    }

    syncView();
  }

  function onKeydown(event) {
    const key = event.key;
    const digitMatch = key.match(/^[0-9]$/);
    if (digitMatch) {
      event.preventDefault();
      handleAction("digit", key);
      return;
    }

    const keyboardMap = {
      ".": ["decimal"],
      ",": ["decimal"],
      "+": ["operator", "+"],
      "-": ["operator", "-"],
      "*": ["operator", "*"],
      "/": ["operator", "/"],
      "%": ["percent"],
      Enter: ["equals"],
      "=": ["equals"],
      Backspace: ["delete"],
      Escape: ["clear"]
    };

    if (keyboardMap[key]) {
      event.preventDefault();
      handleAction(...keyboardMap[key]);
    }
  }

  document.querySelectorAll(".calc-btn").forEach((button) => {
    button.addEventListener("click", () => {
      handleAction(button.dataset.action, button.dataset.value);
    });
  });

  clearHistoryButton.addEventListener("click", async () => {
    await clearHistory();
    historyCache = [];
    renderHistory();
  });

  openOptionsButton.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
  });

  document.addEventListener("keydown", onKeydown);

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === "sync") {
      settings = await getSyncSettings();
      document.documentElement.lang = settings.language;
      document.body.dataset.compact = String(settings.compactMode);
      bindTranslations(document, settings.language);
      renderHistory();
      syncView();
    }

    if (areaName === "local" && changes.calculatorHistory) {
      historyCache = changes.calculatorHistory.newValue || [];
      renderHistory();
    }
  });

  document.documentElement.lang = settings.language;
  document.body.dataset.compact = String(settings.compactMode);
  bindTranslations(document, settings.language);
  renderHistory();
  syncView();
});
