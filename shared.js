(function () {
  const DEFAULT_SETTINGS = {
    language: "en",
    historyEnabled: true,
    historyLimit: 10,
    compactMode: false
  };

  const MAX_RESULT_LENGTH = 18;

  const translations = {
    en: {
      appTitle: "BRNV Calculator",
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
      openBracket: "(",
      closeBracket: ")",
      optionsTitle: "BRNV Calculator",
      optionsDescription: "",
      language: "Language",
      languageEnglish: "English",
      languageUkrainian: "Ukrainian",
      historyEnabledLabel: "Enable history",
      historyLimit: "Recent calculations to keep",
      compactMode: "Compact mode",
      saveStatus: "Settings saved",
      largeViewTitle: "BRNV Calculator"
    },
    uk: {
      appTitle: "BRNV Calculator",
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
      openBracket: "(",
      closeBracket: ")",
      optionsTitle: "BRNV Calculator",
      optionsDescription: "",
      language: "Мова",
      languageEnglish: "Англійська",
      languageUkrainian: "Українська",
      historyEnabledLabel: "Увімкнути історію",
      historyLimit: "Скільки останніх обчислень зберігати",
      compactMode: "Компактний режим",
      saveStatus: "Налаштування збережено",
      largeViewTitle: "BRNV Calculator"
    }
  };

  function getLocaleText(language, key) {
    const locale = translations[language] || translations.en;
    return locale[key] || translations.en[key] || key;
  }

  function isDigit(char) {
    return /\d/.test(char);
  }

  function isOperator(char) {
    return ["+", "-", "*", "/"].includes(char);
  }

  function countOccurrences(text, char) {
    return [...text].filter((item) => item === char).length;
  }

  function normalizeExpression(expression) {
    return expression
      .replace(/\*/g, "×")
      .replace(/\//g, "÷")
      .replace(/-/g, "−");
  }

  function localizeExpression(expression, language) {
    const normalized = normalizeExpression(expression);
    return language === "uk" ? normalized.replace(/\./g, ",") : normalized;
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
    return text.length > MAX_RESULT_LENGTH ? normalized.toPrecision(12).replace(/\.?0+$/, "") : text;
  }

  function findCurrentNumberRange(expression) {
    if (!expression) {
      return null;
    }

    let end = expression.length - 1;
    if (!isDigit(expression[end]) && expression[end] !== ".") {
      return null;
    }

    let start = end;
    while (start >= 0 && (isDigit(expression[start]) || expression[start] === ".")) {
      start -= 1;
    }

    const signIndex = start;
    const unaryMinus =
      signIndex >= 0 &&
      expression[signIndex] === "-" &&
      (signIndex === 0 || isOperator(expression[signIndex - 1]) || expression[signIndex - 1] === "(");

    return {
      start: unaryMinus ? signIndex : start + 1,
      end: end + 1
    };
  }

  function tokenizeExpression(expression) {
    const tokens = [];
    let index = 0;

    while (index < expression.length) {
      const char = expression[index];
      const previous = tokens[tokens.length - 1];
      const unaryMinus = char === "-" && (!previous || previous.type === "operator" || previous.type === "leftParen");

      if (unaryMinus && expression[index + 1] === "(") {
        tokens.push({ type: "number", value: "-1" });
        tokens.push({ type: "operator", value: "*" });
        index += 1;
        continue;
      }

      if (isDigit(char) || char === "." || (unaryMinus && (isDigit(expression[index + 1]) || expression[index + 1] === "."))) {
        let number = unaryMinus ? "-" : "";
        if (unaryMinus) {
          index += 1;
        }

        let dotCount = 0;
        while (index < expression.length && (isDigit(expression[index]) || expression[index] === ".")) {
          if (expression[index] === ".") {
            dotCount += 1;
            if (dotCount > 1) {
              return null;
            }
          }
          number += expression[index];
          index += 1;
        }

        if (number === "-" || number === "." || number === "-.") {
          return null;
        }

        tokens.push({ type: "number", value: number });
        continue;
      }

      if (isOperator(char)) {
        tokens.push({ type: "operator", value: char });
        index += 1;
        continue;
      }

      if (char === "(") {
        tokens.push({ type: "leftParen", value: char });
        index += 1;
        continue;
      }

      if (char === ")") {
        tokens.push({ type: "rightParen", value: char });
        index += 1;
        continue;
      }

      return null;
    }

    return tokens;
  }

  function toRpn(tokens) {
    const output = [];
    const operators = [];
    const precedence = {
      "+": 1,
      "-": 1,
      "*": 2,
      "/": 2
    };

    for (const token of tokens) {
      if (token.type === "number") {
        output.push(token);
        continue;
      }

      if (token.type === "operator") {
        while (operators.length > 0) {
          const top = operators[operators.length - 1];
          if (top.type === "operator" && precedence[top.value] >= precedence[token.value]) {
            output.push(operators.pop());
          } else {
            break;
          }
        }
        operators.push(token);
        continue;
      }

      if (token.type === "leftParen") {
        operators.push(token);
        continue;
      }

      if (token.type === "rightParen") {
        let foundLeftParen = false;
        while (operators.length > 0) {
          const top = operators.pop();
          if (top.type === "leftParen") {
            foundLeftParen = true;
            break;
          }
          output.push(top);
        }

        if (!foundLeftParen) {
          return null;
        }
      }
    }

    while (operators.length > 0) {
      const top = operators.pop();
      if (top.type === "leftParen") {
        return null;
      }
      output.push(top);
    }

    return output;
  }

  function evaluateRpn(tokens) {
    const stack = [];

    for (const token of tokens) {
      if (token.type === "number") {
        stack.push(Number.parseFloat(token.value));
        continue;
      }

      const right = stack.pop();
      const left = stack.pop();

      if (left === undefined || right === undefined) {
        return null;
      }

      switch (token.value) {
        case "+":
          stack.push(left + right);
          break;
        case "-":
          stack.push(left - right);
          break;
        case "*":
          stack.push(left * right);
          break;
        case "/":
          if (right === 0) {
            return null;
          }
          stack.push(left / right);
          break;
        default:
          return null;
      }
    }

    return stack.length === 1 ? stack[0] : null;
  }

  function evaluateExpression(expression) {
    const tokens = tokenizeExpression(expression);
    if (!tokens) {
      return null;
    }

    const rpn = toRpn(tokens);
    if (!rpn) {
      return null;
    }

    const result = evaluateRpn(rpn);
    if (result === null) {
      return null;
    }

    return formatNumber(result);
  }

  class CalculatorEngine {
    constructor(onHistorySave) {
      this.onHistorySave = onHistorySave;
      this.clearAll();
    }

    clearAll() {
      this.expression = "";
      this.previewValue = "0";
      this.resultValue = null;
      this.lastSolvedExpression = "";
      this.justEvaluated = false;
      this.error = false;
    }

    getState() {
      if (this.error) {
        return {
          displayValue: "Error",
          expressionValue: this.lastSolvedExpression || "",
          rawExpression: "",
          error: true
        };
      }

      if (this.justEvaluated) {
        return {
          displayValue: this.resultValue || "0",
          expressionValue: normalizeExpression(this.lastSolvedExpression),
          rawExpression: this.expression,
          error: false
        };
      }

      return {
        displayValue: this.expression || "0",
        expressionValue: this.previewValue || "0",
        rawExpression: this.expression,
        error: false
      };
    }

    restore(rawExpression) {
      this.clearAll();
      this.expression = rawExpression || "";
      this.previewValue = this.computePreview();
    }

    inputDigit(digit) {
      if (this.error || this.justEvaluated) {
        this.clearAll();
      }

      const range = findCurrentNumberRange(this.expression);
      if (range) {
        const current = this.expression.slice(range.start, range.end);
        if (current === "0") {
          this.expression = `${this.expression.slice(0, range.start)}${digit}`;
          this.previewValue = this.computePreview();
          return;
        }

        if (current === "-0") {
          this.expression = `${this.expression.slice(0, range.start)}-${digit}`;
          this.previewValue = this.computePreview();
          return;
        }
      }

      this.expression += digit;
      this.previewValue = this.computePreview();
    }

    inputDecimal() {
      if (this.error || this.justEvaluated) {
        this.clearAll();
      }

      const range = findCurrentNumberRange(this.expression);
      if (range) {
        const current = this.expression.slice(range.start, range.end);
        if (current.includes(".")) {
          return;
        }
        this.expression += ".";
        this.previewValue = this.computePreview();
        return;
      }

      const lastChar = this.expression.slice(-1);
      if (!this.expression || isOperator(lastChar) || lastChar === "(") {
        this.expression += "0.";
        this.previewValue = this.computePreview();
      }
    }

    inputOperator(operator) {
      if (this.error) {
        return;
      }

      if (this.justEvaluated) {
        this.expression = this.resultValue || "0";
        this.justEvaluated = false;
      }

      if (!this.expression) {
        if (operator === "-") {
          this.expression = "-";
        }
        this.previewValue = this.computePreview();
        return;
      }

      const lastChar = this.expression.slice(-1);
      if (isOperator(lastChar)) {
        this.expression = `${this.expression.slice(0, -1)}${operator}`;
      } else if (lastChar === "(" && operator === "-") {
        this.expression += operator;
      } else if (lastChar !== "(" && lastChar !== ".") {
        this.expression += operator;
      }

      this.previewValue = this.computePreview();
    }

    inputParenthesis(parenthesis) {
      if (this.error) {
        this.clearAll();
      }

      if (this.justEvaluated) {
        if (parenthesis === "(") {
          this.expression = `${this.resultValue || "0"}*(`;
          this.justEvaluated = false;
          this.previewValue = this.computePreview();
          return;
        }
        this.justEvaluated = false;
      }

      const lastChar = this.expression.slice(-1);
      const openCount = countOccurrences(this.expression, "(");
      const closeCount = countOccurrences(this.expression, ")");

      if (parenthesis === "(") {
        if (!this.expression || isOperator(lastChar) || lastChar === "(") {
          this.expression += "(";
        } else {
          this.expression += "*(";
        }
      }

      if (parenthesis === ")" && openCount > closeCount && (isDigit(lastChar) || lastChar === ")" )) {
        this.expression += ")";
      }

      this.previewValue = this.computePreview();
    }

    toggleSign() {
      if (this.error) {
        return;
      }

      if (this.justEvaluated) {
        if (this.resultValue) {
          this.expression = this.resultValue.startsWith("-") ? this.resultValue.slice(1) : `-${this.resultValue}`;
          this.justEvaluated = false;
          this.previewValue = this.computePreview();
        }
        return;
      }

      const range = findCurrentNumberRange(this.expression);
      if (!range) {
        const lastChar = this.expression.slice(-1);
        if (!this.expression || isOperator(lastChar) || lastChar === "(") {
          this.expression += "-";
        }
        this.previewValue = this.computePreview();
        return;
      }

      const current = this.expression.slice(range.start, range.end);
      const toggled = current.startsWith("-") ? current.slice(1) : `-${current}`;
      this.expression = `${this.expression.slice(0, range.start)}${toggled}${this.expression.slice(range.end)}`;
      this.previewValue = this.computePreview();
    }

    percent() {
      if (this.error) {
        return;
      }

      const range = findCurrentNumberRange(this.expression);
      if (!range) {
        return;
      }

      const current = Number.parseFloat(this.expression.slice(range.start, range.end));
      const formatted = formatNumber(current / 100);
      if (!formatted) {
        this.setError();
        return;
      }

      this.expression = `${this.expression.slice(0, range.start)}${formatted}${this.expression.slice(range.end)}`;
      this.previewValue = this.computePreview();
    }

    backspace() {
      if (this.error || this.justEvaluated) {
        this.clearAll();
        return;
      }

      if (!this.expression) {
        return;
      }

      this.expression = this.expression.slice(0, -1);
      this.previewValue = this.computePreview();
    }

    calculate() {
      if (this.error) {
        return null;
      }

      const prepared = this.prepareExpressionForEquals();
      if (!prepared) {
        this.setError();
        return null;
      }

      const result = evaluateExpression(prepared);
      if (!result) {
        this.setError();
        return null;
      }

      const prettyExpression = normalizeExpression(prepared);
      this.expression = result;
      this.resultValue = result;
      this.lastSolvedExpression = prettyExpression;
      this.previewValue = result;
      this.justEvaluated = true;

      if (typeof this.onHistorySave === "function") {
        this.onHistorySave({
          expression: prettyExpression,
          rawExpression: prepared,
          result,
          timestamp: Date.now()
        });
      }

      return {
        expression: prettyExpression,
        rawExpression: prepared,
        result
      };
    }

    computePreview() {
      const prepared = this.prepareExpressionForPreview();
      if (!prepared) {
        return "0";
      }

      return evaluateExpression(prepared) || "0";
    }

    prepareExpressionForPreview() {
      if (!this.expression) {
        return null;
      }

      const lastChar = this.expression.slice(-1);
      if (isOperator(lastChar) || lastChar === "(" || lastChar === "-" || lastChar === ".") {
        return null;
      }

      const missingClosers = countOccurrences(this.expression, "(") - countOccurrences(this.expression, ")");
      return missingClosers > 0 ? `${this.expression}${")".repeat(missingClosers)}` : this.expression;
    }

    prepareExpressionForEquals() {
      if (!this.expression) {
        return null;
      }

      let prepared = this.expression;
      while (prepared && (isOperator(prepared.slice(-1)) || prepared.slice(-1) === "." || prepared.slice(-1) === "(")) {
        prepared = prepared.slice(0, -1);
      }

      if (!prepared || prepared === "-") {
        return null;
      }

      const missingClosers = countOccurrences(prepared, "(") - countOccurrences(prepared, ")");
      if (missingClosers > 0) {
        prepared += ")".repeat(missingClosers);
      }

      return prepared;
    }

    setError() {
      this.expression = "";
      this.previewValue = "0";
      this.resultValue = null;
      this.lastSolvedExpression = "";
      this.justEvaluated = false;
      this.error = true;
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
    normalizeExpression,
    localizeExpression
  };
})();
