export function createApp() {
  const content = document.createElement("div");
  content.style.display = "grid";
  content.style.gridTemplateRows = "auto 1fr";
  content.style.height = "100%";
  content.style.gap = "10px";

  const display = document.createElement("input");
  display.type = "text";
  display.readOnly = true;
  display.value = "0";
  display.style.width = "100%";
  display.style.fontSize = "1.6rem";
  display.style.padding = "10px";
  display.style.borderRadius = "10px";
  display.style.border = "1px solid rgba(255,255,255,0.2)";
  display.style.background = "rgba(8, 12, 18, 0.6)";
  display.style.color = "var(--text)";

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(4, 1fr)";
  grid.style.gap = "8px";

  const buttons = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "=", "+",
    "C", "←"
  ];

  let buffer = "";

  const updateDisplay = (value) => {
    display.value = value || "0";
  };

  const append = (val) => {
    buffer += val;
    updateDisplay(buffer);
  };

  const clear = () => {
    buffer = "";
    updateDisplay(buffer);
  };

  const backspace = () => {
    buffer = buffer.slice(0, -1);
    updateDisplay(buffer);
  };

  const compute = () => {
    if (!buffer) return;
    try {
      const result = evaluateExpression(buffer);
      buffer = String(result);
      updateDisplay(buffer);
    } catch {
      updateDisplay("Error");
      buffer = "";
    }
  };

  buttons.forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "menu-button";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (label === "C") return clear();
      if (label === "←") return backspace();
      if (label === "=") return compute();
      append(label);
    });
    grid.appendChild(btn);
  });

  content.appendChild(display);
  content.appendChild(grid);

  return {
    title: "Calculator",
    width: 320,
    height: 420,
    content,
  };
}

function evaluateExpression(input) {
  const tokens = tokenize(input);
  const rpn = toRpn(tokens);
  return evalRpn(rpn);
}

function tokenize(input) {
  const tokens = [];
  let number = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (/\d|\./.test(ch)) {
      number += ch;
      continue;
    }
    if (number) {
      tokens.push({ type: "number", value: parseFloat(number) });
      number = "";
    }
    if (/[\+\-\*\/\(\)]/.test(ch)) {
      tokens.push({ type: "op", value: ch });
    }
  }
  if (number) tokens.push({ type: "number", value: parseFloat(number) });
  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const ops = [];
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };

  tokens.forEach((token) => {
    if (token.type === "number") {
      output.push(token);
      return;
    }
    const op = token.value;
    if (op === "(") {
      ops.push(op);
      return;
    }
    if (op === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") {
        output.push({ type: "op", value: ops.pop() });
      }
      ops.pop();
      return;
    }
    while (ops.length && prec[ops[ops.length - 1]] >= prec[op]) {
      output.push({ type: "op", value: ops.pop() });
    }
    ops.push(op);
  });

  while (ops.length) {
    output.push({ type: "op", value: ops.pop() });
  }
  return output;
}

function evalRpn(tokens) {
  const stack = [];
  tokens.forEach((token) => {
    if (token.type === "number") {
      stack.push(token.value);
      return;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (token.value === "+") stack.push(a + b);
    if (token.value === "-") stack.push(a - b);
    if (token.value === "*") stack.push(a * b);
    if (token.value === "/") stack.push(a / b);
  });
  if (stack.length !== 1 || Number.isNaN(stack[0])) throw new Error("Invalid");
  return stack[0];
}
