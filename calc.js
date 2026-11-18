/* ═══════════════════════════════════════
   CALCULADORA CIENTÍFICA
═══════════════════════════════════════ */
let expr = '';
let isDeg = true;
let memory = 0;
let justCalculated = false;

const $result = document.getElementById('result');
const $expr   = document.getElementById('expression');

function fact(n) {
  n = Math.round(n);
  if (n < 0 || n > 170) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function prepareExpr(e) {
  if (!isDeg) return e;
  return e
    .replace(/Math\.sin\(/g,  'Math.sin(Math.PI/180*(')
    .replace(/Math\.cos\(/g,  'Math.cos(Math.PI/180*(')
    .replace(/Math\.tan\(/g,  'Math.tan(Math.PI/180*(')
    .replace(/Math\.asin\(/g, '(180/Math.PI*Math.asin(')
    .replace(/Math\.acos\(/g, '(180/Math.PI*Math.acos(')
    .replace(/Math\.atan\(/g, '(180/Math.PI*Math.atan(');
}

function autoClose(e) {
  const d = (e.match(/\(/g)||[]).length - (e.match(/\)/g)||[]).length;
  return e + ')'.repeat(Math.max(0, d));
}

function evalExpr(e) {
  const prepared = autoClose(prepareExpr(e));
  return Function('"use strict";return(' + prepared + ')')();
}

function updateDisplay() {
  $result.textContent = expr || '0';
  $result.classList.remove('error');
}

function inp(val) {
  if (justCalculated && /^[\d(]|Math\.(PI|E)$/.test(val)) expr = '';
  justCalculated = false;
  expr += val;
  updateDisplay();
}

function inpPow(n) {
  justCalculated = false;
  const m = expr.match(/([\d.]+|\))$/);
  if (m) {
    const base = m[0];
    expr = expr.slice(0, -base.length) + 'Math.pow(' + base + ',' + n + ')';
  } else {
    expr += 'Math.pow(';
  }
  updateDisplay();
}

function inputDot() {
  justCalculated = false;
  const parts = expr.split(/[+\-*/(%]/);
  if (!(parts[parts.length - 1] || '').includes('.')) expr += '.';
  updateDisplay();
}

function backspace() {
  justCalculated = false;
  expr = expr.slice(0, -1);
  updateDisplay();
}

function clearAll() {
  expr = '';
  justCalculated = false;
  $expr.textContent = '';
  $result.textContent = '0';
  $result.classList.remove('error');
}

function toggleSign() {
  if (!expr) return;
  expr = expr.startsWith('-') ? expr.slice(1) : '-' + expr;
  updateDisplay();
}

function toggleMode() {
  isDeg = !isDeg;
  document.querySelector('[onclick="toggleMode()"]').textContent = isDeg ? 'DEG' : 'RAD';
}

function calculate() {
  if (!expr) return;
  try {
    const raw = evalExpr(expr);
    if (!isFinite(raw)) throw new Error();
    const formatted = parseFloat(raw.toPrecision(12)).toString();
    $expr.textContent = expr + ' =';
    $result.textContent = formatted;
    $result.classList.remove('error');
    $result.classList.remove('pop');
    void $result.offsetWidth;
    $result.classList.add('pop');
    historyAdd(expr, formatted);
    expr = formatted;
    justCalculated = true;
  } catch {
    $result.textContent = 'Erro';
    $result.classList.add('error');
    expr = '';
    justCalculated = false;
  }
}

function historyAdd(expression, result) {
  const history = JSON.parse(localStorage.getItem('calcHistory') || '[]');
  history.unshift({ expression, result, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
  if (history.length > 50) history.pop();
  localStorage.setItem('calcHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('calcHistory') || '[]');
  const list    = document.getElementById('historyList');
  const empty   = document.getElementById('historyEmpty');
  const count   = document.getElementById('historyCount');
  if (!list) return;
  count.textContent = history.length + (history.length === 1 ? ' cálculo' : ' cálculos');
  if (history.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = history.map((item, i) => `
    <div class="history-item" onclick="historyReuse('${item.result}')" title="Clique para reutilizar">
      <div class="history-expr">${item.expression}</div>
      <div class="history-row">
        <span class="history-result">${item.result}</span>
        <span class="history-time">${item.time}</span>
      </div>
    </div>
  `).join('');
}

function historyReuse(value) {
  justCalculated = false;
  expr = value;
  updateDisplay();
  switchTab('calc');
}

function clearHistory() {
  localStorage.removeItem('calcHistory');
  renderHistory();
}

// Carrega histórico ao iniciar
renderHistory();

function memStore()  { memory = parseFloat($result.textContent) || 0; }
function memRecall() { justCalculated = false; expr += memory.toString(); updateDisplay(); }
function memClear()  { memory = 0; }

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key;
  if (k >= '0' && k <= '9')      { inp(k); return; }
  if (k === '+')                  { inp('+'); return; }
  if (k === '-')                  { inp('-'); return; }
  if (k === '*')                  { inp('*'); return; }
  if (k === '/')                  { e.preventDefault(); inp('/'); return; }
  if (k === '.')                  { inputDot(); return; }
  if (k === 'Enter' || k === '=') { calculate(); return; }
  if (k === 'Backspace')          { backspace(); return; }
  if (k === 'Escape')             { clearAll(); return; }
  if (k === '(' || k === ')')     { inp(k); return; }
  if (e.ctrlKey || e.metaKey) return;
  switch (k.toLowerCase()) {
    case 's': inp('Math.sin('); break;
    case 'c': inp('Math.cos('); break;
    case 't': inp('Math.tan('); break;
    case 'l': inp('Math.log10('); break;
    case 'n': inp('Math.log('); break;
    case 'r': inp('Math.sqrt('); break;
    case 'p': inp('Math.PI'); break;
    case 'e': inp('Math.E'); break;
  }
});
