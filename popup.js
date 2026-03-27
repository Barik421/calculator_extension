document.addEventListener("DOMContentLoaded", async () => {
  const {
    CalculatorEngine,
    getSyncSettings,
    getHistory,
    saveHistoryItem,
    clearHistory,
    bindTranslations,
    getLocaleText,
    localizeExpression
  } = window.CalculatorApp;

  const display = document.getElementById("display");
  const expression = document.getElementById("expression");
  const historyList = document.getElementById("historyList");
  const historyPanel = document.getElementById("historyPanel");
  const toggleHistoryButton = document.getElementById("toggleHistory");
  const clearHistoryButton = document.getElementById("clearHistory");
  const openLargeViewButton = document.getElementById("openLargeView");
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

    return localizeExpression(value, settings.language);
  }

  function syncView() {
    const state = engine.getState();
    display.textContent = localizeDisplayValue(state.displayValue);
    expression.textContent = localizeDisplayValue(state.expressionValue || "0");
    display.scrollLeft = display.scrollWidth;
  }

  function renderHistory() {
    historyList.innerHTML = "";
    historyPanel.hidden = !settings.historyEnabled;

    if (!settings.historyEnabled) {
      return;
    }

    if (historyCache.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "history-empty";
      emptyState.textContent = getLocaleText(settings.language, "noHistory");
      historyList.appendChild(emptyState);
      return;
    }

    historyCache.slice(0, settings.historyLimit).forEach((item) => {
      const button = document.createElement("button");
      button.className = "history-item";
      button.type = "button";
      button.innerHTML = `
        <p class="history-expression">${localizeDisplayValue(item.expression)}</p>
        <p class="history-result">${localizeDisplayValue(item.result)}</p>
      `;
      button.addEventListener("click", () => {
        engine.restore(item.rawExpression || item.result);
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
        engine.inputOperator(value);
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
      case "paren":
        engine.inputParenthesis(value);
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
      "(": ["paren", "("],
      ")": ["paren", ")"],
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

  toggleHistoryButton.addEventListener("click", () => {
    historyPanel.classList.toggle("collapsed");
  });

  clearHistoryButton.addEventListener("click", async () => {
    await clearHistory();
    historyCache = [];
    renderHistory();
  });

  openLargeViewButton.addEventListener("click", async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL("large.html") });
  });

  openOptionsButton.addEventListener("click", async () => {
    window.location.href = chrome.runtime.getURL("options.html?view=popup&returnTo=popup.html");
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
