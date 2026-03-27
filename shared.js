(function () {
  const DEFAULT_SETTINGS = {
    language: "en",
    historyEnabled: true,
    historyLimit: 10,
    compactMode: false
  };

  const MAX_DISPLAY_LENGTH = 14;

  const translations = {
    en: {
      appTitle: "Simple Calculator",
      history: "History",
      noHistory: "No calculations yet",
      historyDisabled: "History is disabled in settings",
      clearHistory: "Clear history",
      openLargeView: "Open large view",
      settings: "Settings",
      back: "Back",
      backToCalculator: "Back to calculator",
      error: "Error",
      ac: "AC",
      delete: "DEL",
      percent: "%",
      divide: "÷",
      multiply: "×",
      subtract: "−",
      add: "+",
      equals: "=",
      decimal: ".",
      optionsTitle: "Calculator settings",
      optionsDescription: "Customize language, history, and layout preferences for your extension pack.",
      language: "Language",
      languageEnglish: "English",
      languageUkrainian: "Ukrainian",
      historyEnabledLabel: "Enable history",
      historyLimit: "Recent calculations to keep",
      compactMode: "Compact mode",
      saveStatus: "Settings saved",
      largeViewTitle: "Large calculator view",
      reuseResult: "Reuse result",
      expression: "Expression",
      result: "Result"
    },
    uk: {
      appTitle: "Простий калькулятор",
      history: "Історія",
      noHistory: "Обчислень ще немає",
      historyDisabled: "Історію вимкнено в налаштуваннях",
      clearHistory: "Очистити історію",
      openLargeView: "Відкрити великий вигляд",
      settings: "Налаштування",
      back: "Назад",
      backToCalculator: "Повернутися до калькулятора",
      error: "Помилка",
      ac: "AC",
      delete: "DEL",
      percent: "%",
      divide: "÷",
      multiply: "×",
      subtract: "−",
      add: "+",
      equals: "=",
      decimal: ",",
      optionsTitle: "Налаштування калькулятора",
      optionsDescription: "Змініть мову, історію та параметри вигляду для вашого extension pack.",
      language: "Мова",
      languageEnglish: "Англійська",
      languageUkrainian: "Українська",
      historyEnabledLabel: "Увімкнути історію",
      historyLimit: "Скільки останніх обчислень зберігати",
      compactMode: "Компактний режим",
      saveStatus: "Налаштування збережено",
      largeViewTitle: "Великий вигляд калькулятора",
      reuseResult: "Повторно використати результат",
      expression: "Вираз",
      result: "Результат"
    }
  };

  function getLocaleText(language, key) {
    const locale = translations[language] || translations.en;
    return locale[key] || translations.en[key] || key;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return null;
    }

    const absValue = Math.abs(value);
    if (absValue !== 0 && (absValue >= 1e12 || absValue < 1e-9)) {
      return value.toExponential(8).replace(/\.?0+e/, "e");
    }

    const normalized = Number.parseFloat(value.toFixed(10));
    const text = `${normalized}`;
    return text.length > MAX_DISPLAY_LENGTH ? normalized.toPrecision(10).replace(/\.?0+$/, "") : text;
  }

  function normalizeExpression(expression) {
    return expression.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
  }

  class CalculatorEngine {
    constructor(onHistorySave) {
      this.onHistorySave = onHistorySave;
      this.clearAll();
    }

    clearAll() {
      this.displayValue = "0";
      this.previousValue = null;
      this.operator = null;
      this.waitingForOperand = false;
      this.error = false;
      this.expression = "";
    }

    getState() {
      return {
        displayValue: this.displayValue,
        previousValue: this.previousValue,
        operator: this.operator,
        waitingForOperand: this.waitingForOperand,
        error: this.error,
        expression: this.expression
      };
    }

    restore(value, expression) {
      this.clearAll();
      this.displayValue = `${value}`;
      this.expression = expression || "";
    }

    inputDigit(digit) {
      if (this.error) {
        this.clearAll();
      }

      if (this.waitingForOperand) {
        this.displayValue = digit;
        this.waitingForOperand = false;
        return;
      }

      if (this.displayValue === "0") {
        this.displayValue = digit;
        return;
      }

      if (this.displayValue.length >= MAX_DISPLAY_LENGTH) {
        return;
      }

      this.displayValue += digit;
    }

    inputDecimal() {
      if (this.error) {
        this.clearAll();
      }

      if (this.waitingForOperand) {
        this.displayValue = "0.";
        this.waitingForOperand = false;
        return;
      }

      if (!this.displayValue.includes(".")) {
        this.displayValue += ".";
      }
    }

    setOperator(nextOperator) {
      if (this.error) {
        return;
      }

      const inputValue = Number.parseFloat(this.displayValue);

      if (this.operator && this.waitingForOperand) {
        this.operator = nextOperator;
        return;
      }

      if (this.previousValue === null) {
        this.previousValue = inputValue;
      } else if (this.operator) {
        const result = this.performCalculation(this.previousValue, inputValue, this.operator);
        if (result === null) {
          this.setError();
          return;
        }
        this.previousValue = result;
        this.displayValue = formatNumber(result) || "0";
      }

      this.operator = nextOperator;
      this.waitingForOperand = true;
      this.expression = `${formatNumber(this.previousValue) || this.previousValue} ${normalizeExpression(nextOperator)}`;
    }

    calculate() {
      if (this.error || this.operator === null || this.waitingForOperand) {
        return null;
      }

      const currentValue = Number.parseFloat(this.displayValue);
      const result = this.performCalculation(this.previousValue, currentValue, this.operator);

      if (result === null) {
        this.setError();
        return null;
      }

      const left = formatNumber(this.previousValue) || `${this.previousValue}`;
      const right = formatNumber(currentValue) || `${currentValue}`;
      const expression = `${left} ${normalizeExpression(this.operator)} ${right}`;
      const formattedResult = formatNumber(result);

      if (!formattedResult) {
        this.setError();
        return null;
      }

      this.displayValue = formattedResult;
      this.previousValue = null;
      this.operator = null;
      this.waitingForOperand = false;
      this.expression = expression;

      if (typeof this.onHistorySave === "function") {
        this.onHistorySave({
          expression,
          result: formattedResult,
          timestamp: Date.now()
        });
      }

      return {
        expression,
        result: formattedResult
      };
    }

    backspace() {
      if (this.error) {
        this.clearAll();
        return;
      }

      if (this.waitingForOperand) {
        return;
      }

      if (this.displayValue.length === 1 || (this.displayValue.length === 2 && this.displayValue.startsWith("-"))) {
        this.displayValue = "0";
        return;
      }

      this.displayValue = this.displayValue.slice(0, -1);
    }

    toggleSign() {
      if (this.error || this.displayValue === "0") {
        return;
      }

      this.displayValue = this.displayValue.startsWith("-")
        ? this.displayValue.slice(1)
        : `-${this.displayValue}`;
    }

    percent() {
      if (this.error) {
        return;
      }

      const currentValue = Number.parseFloat(this.displayValue);
      let nextValue = currentValue / 100;

      if (this.previousValue !== null && this.operator && (this.operator === "+" || this.operator === "-")) {
        nextValue = (this.previousValue * currentValue) / 100;
      }

      const formatted = formatNumber(nextValue);
      if (!formatted) {
        this.setError();
        return;
      }

      this.displayValue = formatted;
      this.waitingForOperand = false;
    }

    performCalculation(left, right, operator) {
      switch (operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right === 0 ? null : left / right;
        default:
          return right;
      }
    }

    setError() {
      this.displayValue = "Error";
      this.previousValue = null;
      this.operator = null;
      this.waitingForOperand = false;
      this.error = true;
      this.expression = "";
    }
  }

  async function getSyncSettings() {
    const values = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...values
    };
  }

  async function saveSyncSettings(settings) {
    await chrome.storage.sync.set(settings);
  }

  async function getHistory() {
    const values = await chrome.storage.local.get({ calculatorHistory: [] });
    return values.calculatorHistory || [];
  }

  async function saveHistoryItem(item, limit) {
    const history = await getHistory();
    const nextHistory = [item, ...history].slice(0, limit);
    await chrome.storage.local.set({ calculatorHistory: nextHistory });
    return nextHistory;
  }

  async function clearHistory() {
    await chrome.storage.local.set({ calculatorHistory: [] });
  }

  function bindTranslations(root, language) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      element.textContent = getLocaleText(language, key);
    });

    root.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      const key = element.dataset.i18nAria;
      element.setAttribute("aria-label", getLocaleText(language, key));
    });
  }

  window.CalculatorApp = {
    DEFAULT_SETTINGS,
    CalculatorEngine,
    getSyncSettings,
    saveSyncSettings,
    getHistory,
    saveHistoryItem,
    clearHistory,
    bindTranslations,
    getLocaleText,
    normalizeExpression
  };
})();
