// Снэпбилд · ноды — логика прототипа
const NS = 'http://www.w3.org/2000/svg';
const phone = matchMedia('(max-width: 767px)');
// до 1199 px полотна раскладываются вертикально: на планшете горизонтальной цепочке тесно, ноды налезают
const narrow = matchMedia('(max-width: 1199px)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
const IMG = name => `img/sevea/${name}.webp`;
// внешний вид «модульный синтезатор»: data-look="synth" на <html>; ?look=classic — прежний вид
if (new URLSearchParams(location.search).get('look') === 'classic') delete document.documentElement.dataset.look;
const synth = () => document.documentElement.dataset.look === 'synth';
// патч-кабель провисает вниз под своим весом
const cable = (x1, y1, x2, y2) => { const L = Math.hypot(x2 - x1, y2 - y1), s = Math.min(24, L * .3) + L * .12; return `M${x1} ${y1} C${x1 + 18} ${y1 + s},${x2 - 18} ${y2 + s},${x2} ${y2}`; };
let plugN = 0;

// ---------- Холст с нодами ----------
class Graph {
  constructor(el) {
    this.el = el;
    this.svg = el.querySelector('svg.wires');
    if (synth()) { // штекеры на концах кабелей
      this.plug = 'plug' + plugN++;
      const defs = document.createElementNS(NS, 'defs');
      defs.innerHTML = `<marker id="${this.plug}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" markerUnits="strokeWidth"><circle cx="5" cy="5" r="4.5" class="plug"/></marker>`;
      this.svg.appendChild(defs);
    }
    this.folded = el.classList.contains('folded');
    this.nodes = {};
    el.querySelectorAll('.node').forEach(n => {
      const id = n.dataset.id;
      this.nodes[id] = n;
      // единый вид: продукт и результат — картинка-нода, решения — карточка с лаймовой шапкой
      if ((id === 'prod' || id === 'res') && n.querySelector('.thumb, .shot') && !n.matches('.in-node, .res-final, .drop-node')) n.classList.add('n-img');
      if (['preset', 'brand', 'check'].includes(id)) n.classList.add('n-dec');
    });
    this.edges = el.dataset.edges.split(',').map(s => {
      // «a>b*» — провод-сверка: исходное фото идёт на проверку, рисуем пунктиром
      const ref = s.endsWith('*');
      const [a, b] = s.replace('*', '').split('>');
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', (ref ? 'wire ref' : 'wire') + ' c' + (this.svg.children.length % 3));
      this.svg.appendChild(p);
      if (synth()) { p.setAttribute('marker-start', `url(#${this.plug})`); p.setAttribute('marker-end', `url(#${this.plug})`); }
      return { a, b, p };
    });
    this.layout();
    new ResizeObserver(() => this.layout()).observe(el);
    narrow.addEventListener('change', () => this.layout());
    this.initDrag();
  }
  get v() { return narrow.matches; }
  coords(n) {
    const d = n.dataset;
    const s = this.v ? (this.folded && d.fmpos) || d.mpos : (this.folded && d.fpos) || d.pos;
    return s.split(',');
  }
  place(n) {
    const W = this.el.clientWidth, H = this.el.clientHeight;
    const w = n.offsetWidth, h = n.offsetHeight;
    const [x, y] = this.coords(n);
    const px = x === 'c' ? (W - w) / 2 : x === 'r' ? W - w : Math.min(+x * W, W - w);
    const py = y === 'c' ? (H - h) / 2 : y === 'b' ? H - h : Math.min(+y * H, H - h);
    n.style.left = px + 'px';
    n.style.top = py + 'px';
  }
  layout() {
    this.el.classList.toggle('v', this.v);
    for (const n of Object.values(this.nodes)) {
      if (n._free && !this.v) continue;
      this.place(n);
    }
    this.track(900);
  }
  port(n, kind) {
    const p = n.querySelector('.port.' + kind);
    const r = p.getBoundingClientRect(), c = this.el.getBoundingClientRect();
    return [r.left + r.width / 2 - c.left, r.top + r.height / 2 - c.top];
  }
  path(e) {
    const [x1, y1] = this.port(this.nodes[e.a], 'out');
    const [x2, y2] = this.port(this.nodes[e.b], 'in');
    if (this.v) {
      const d = Math.max(30, Math.abs(y2 - y1) / 2);
      return `M${x1} ${y1} C${x1} ${y1 + d},${x2} ${y2 - d},${x2} ${y2}`;
    }
    if (synth()) return cable(x1, y1, x2, y2);
    const d = Math.max(40, Math.abs(x2 - x1) / 2);
    return `M${x1} ${y1} C${x1 + d} ${y1},${x2 - d} ${y2},${x2} ${y2}`;
  }
  draw() { this.edges.forEach(e => e.p.setAttribute('d', this.path(e))); }
  // перерисовывать провода, пока ноды едут
  track(ms) {
    const end = performance.now() + ms;
    cancelAnimationFrame(this._raf);
    const step = () => { this.draw(); if (performance.now() < end) this._raf = requestAnimationFrame(step); };
    step();
  }
  // ноды появляются по ходу сигнала: сначала входы, потом решения, в конце результат
  hideNodes() { if (!reduce) this.el.classList.add('pre'); }
  appear(gap = 160) {
    if (!this.el.classList.contains('pre')) return 0;
    const depth = id => { const inc = this.edges.filter(e => e.b === id); return inc.length ? 1 + Math.max(...inc.map(e => depth(e.a))) : 0; };
    let max = 0;
    Object.entries(this.nodes).forEach(([id, n]) => { const d = depth(id); max = Math.max(max, d); setTimeout(() => n.classList.add('in'), d * gap); });
    const total = max * gap + 500;
    setTimeout(() => { this.el.classList.remove('pre'); Object.values(this.nodes).forEach(n => n.classList.remove('in')); }, total);
    return total;
  }
  // провода прорисовываются
  drawIn(gap = 140) {
    this.draw();
    this.edges.forEach((e, i) => {
      const p = e.p, len = p.getTotalLength();
      if (reduce) return;
      p.style.transition = 'none';
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.getBoundingClientRect();
      p.style.transition = `stroke-dashoffset .7s cubic-bezier(.16,1,.3,1) ${i * gap}ms`;
      p.style.strokeDashoffset = 0;
      setTimeout(() => { p.style.transition = ''; p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }, 800 + i * gap);
    });
  }
  // по проводам бегут данные: от входов к результату
  async pulse(only) {
    if (reduce) return;
    const depth = id => { const inc = this.edges.filter(e => e.b === id); return inc.length ? 1 + Math.max(...inc.map(e => depth(e.a))) : 0; };
    const list = this.edges.filter(e => !only || only.includes(e.a));
    const runs = list.map(e => {
      const lvl = depth(e.a) - (only ? Math.min(...only.map(depth)) : 0);
      return new Promise(res => setTimeout(() => {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('r', 5); dot.setAttribute('class', 'pulse');
        this.svg.appendChild(dot);
        const t0 = performance.now(), dur = 520;
        const step = now => {
          const t = Math.min(1, (now - t0) / dur), len = e.p.getTotalLength();
          const pt = e.p.getPointAtLength(len * (1 - Math.pow(1 - t, 2)));
          dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
          if (t < 1) requestAnimationFrame(step); else { dot.remove(); res(); }
        };
        requestAnimationFrame(step);
      }, lvl * 420));
    });
    await Promise.all(runs);
  }
  initDrag() {
    Object.values(this.nodes).forEach(n => {
      const h = n.querySelector('.node-h');
      h.addEventListener('pointerdown', ev => {
        if (this.v || ev.target.closest('button')) return;
        ev.preventDefault();
        const W = this.el.clientWidth, H = this.el.clientHeight;
        const sx = ev.clientX - n.offsetLeft, sy = ev.clientY - n.offsetTop;
        n.classList.add('dragging');
        h.setPointerCapture(ev.pointerId);
        const move = e => {
          const x = Math.max(0, Math.min(W - n.offsetWidth, e.clientX - sx));
          const y = Math.max(0, Math.min(H - n.offsetHeight, e.clientY - sy));
          n.style.left = x + 'px'; n.style.top = y + 'px';
          n._free = true; this.draw();
        };
        const up = () => {
          n.classList.remove('dragging');
          h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up);
          this.track(300);
        };
        h.addEventListener('pointermove', move); h.addEventListener('pointerup', up);
      });
    });
  }
  wire(a, b) { return this.edges.find(e => e.a === a && e.b === b).p; }
}

// смена картинки с «генерацией»: размытие, линия сканирования, проявление
// alive — «этот пересчёт ещё актуален?»: устаревший не подменяет картинку
async function regen(box, img, src, alive) {
  const pre = new Image(); pre.src = src;
  box.classList.remove('gen'); void box.offsetWidth; box.classList.add('gen');
  await Promise.all([wait(450), pre.decode().catch(() => {})]);
  if (alive && !alive()) return;
  img.src = src;
  await wait(450);
  box.classList.remove('gen');
}

// ---------- Шапка ----------
const topBar = document.querySelector('.top');
addEventListener('scroll', () => topBar.classList.toggle('scrolled', scrollY > 8), { passive: true });

// ---------- Появление при прокрутке ----------
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  io.unobserve(e.target);
}), { threshold: .2 });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

// холсты оживают, когда доезжают до экрана
const onSeen = (el, fn) => {
  const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold: .35 });
  o.observe(el);
};

// ---------- 2. Каждая нода отвечает за своё ----------
const what = new Graph(document.getElementById('g-what'));
what.el.classList.add('live');
const INFO = {
  prod:   ['Продукт', 'Фото вашего товара. С него всё начинается.', 'Собирать не из чего: результат пустой.'],
  prompt: ['Промпт', 'Что происходит в кадре: где стоит банка, что вокруг, откуда свет.', 'Модель не понимает задачу и останавливается с ошибкой.'],
  preset: ['Пресет', 'Стиль съёмки: свет, фон, формат 3:4 и качество 4K.', 'Получается обычное фото на телефон: плоский свет, серый фон.'],
  brand:  ['Бренд-директор', 'Сверяет кадр с брендом: цвета, композицию, стилистику, лишние детали.', 'Цвета и реквизит уходят в чужой стиль, и никто этого не замечает.'],
  check:  ['Сверка товара', 'Сравнивает результат с исходным фото: форму, крышку, материал. Новая нода, моё предложение для продукта.', 'Нейросеть подменяет сам товар: вместо вашей банки в кадре другое средство.'],
  res:    ['Результат', 'Готовая картинка. Она меняется, как только меняется любая нода выше.', 'Это выход сценария, его не выключают.']
};
const on = { prod: true, prompt: true, preset: true, brand: true, check: true };
const wImg = document.getElementById('what-img'), wState = document.getElementById('what-state');
const wShot = wImg.parentElement, wRes = what.nodes.res, wScore = document.getElementById('what-score');
function select(id) {
  Object.values(what.nodes).forEach(n => n.classList.toggle('sel', n.dataset.id === id));
  const [t, d, w] = INFO[id];
  document.getElementById('p-title').textContent = t;
  document.getElementById('p-does').textContent = d;
  document.getElementById('p-without').textContent = w;
}
let seq = 0; // быстрые переключения: устаревший пересчёт не перезаписывает новый
async function recompute(changed) {
  const my = ++seq;
  what.edges.forEach(e => e.p.classList.toggle('off', on[e.a] === false || (e.a !== 'prod' && e.a !== 'prompt' && (!on.prod || !on.prompt))));
  wRes.classList.remove('err', 'warn');
  wState.className = 'state';
  if (!on.prod) {
    wState.innerHTML = '<b>Нет продукта</b><span class="mono">подключите фото товара, чтобы было что снимать</span>';
    wState.classList.add('show'); wScore.textContent = 'пусто'; return;
  }
  if (!on.prompt) {
    wState.innerHTML = '<b>Модель не поняла задачу</b><span class="mono">опишите сцену в ноде «Промпт»</span>';
    wState.classList.add('show', 'err'); wRes.classList.add('err'); wScore.textContent = 'ошибка'; return;
  }
  const src = !on.preset ? IMG('raw') : !on.brand ? IMG('offbrand') : !on.check ? IMG('distorted') : IMG('studio');
  const label = !on.preset ? 'стиль не задан' : !on.brand ? 'чужой стиль' : !on.check ? 'товар изменён' : 'бренд 99 %';
  if (on.preset && (!on.brand || !on.check)) wRes.classList.add('warn');
  wRes.classList.add('busy'); wScore.textContent = 'собираю…';
  await what.pulse(changed ? [changed] : null);
  if (my !== seq) return;
  await regen(wShot, wImg, src, () => my === seq);
  if (my !== seq) return;
  wRes.classList.remove('busy');
  wScore.textContent = label;
}
Object.values(what.nodes).forEach(n => n.addEventListener('click', () => select(n.dataset.id)));
what.el.querySelectorAll('.sw').forEach(sw => sw.addEventListener('click', e => {
  e.stopPropagation();
  const n = sw.closest('.node'), id = n.dataset.id;
  on[id] = !on[id];
  sw.setAttribute('aria-checked', on[id]);
  n.classList.toggle('off', !on[id]);
  select(id);
  recompute(id);
  syncAll();
}));
// «включить все ноды» — один шаг назад после экспериментов
const wAll = document.getElementById('what-all');
const syncAll = () => (wAll.hidden = Object.values(on).every(Boolean));
wAll.addEventListener('click', () => {
  what.el.querySelectorAll('.sw').forEach(sw => { const n = sw.closest('.node'); on[n.dataset.id] = true; sw.setAttribute('aria-checked', true); n.classList.remove('off'); });
  syncAll(); recompute();
});
what.hideNodes();
onSeen(what.el, () => setTimeout(() => { what.drawIn(); setTimeout(() => what.pulse(), 900); }, what.appear()));
// плашка о ноде — посередине по высоте между низом верхнего ряда (Пресет, Бренд-директор) и низом полотна: воздух сверху = снизу
const wPanel = document.getElementById('what-panel');
function placePanel() {
  if (what.v) { wPanel.style.top = ''; return; }
  const row = Math.max(...['preset', 'brand'].map(k => what.nodes[k].offsetTop + what.nodes[k].offsetHeight));
  wPanel.style.top = Math.round((row + what.el.clientHeight - wPanel.offsetHeight) / 2) + 'px';
}
new ResizeObserver(placePanel).observe(wPanel); new ResizeObserver(placePanel).observe(what.el);
document.fonts.ready.then(placePanel);

// ---------- 3. Меняете одну ноду ----------
const swap = new Graph(document.getElementById('g-swap'));
swap.el.classList.add('live');
const sImg = document.getElementById('swap-img'), sCap = document.getElementById('swap-cap');
let busy = false;
swap.el.querySelectorAll('.presets button').forEach(b => b.addEventListener('click', async () => {
  if (busy || b.getAttribute('aria-checked') === 'true') return;
  busy = true;
  swap.el.querySelectorAll('.presets button').forEach(x => x.setAttribute('aria-checked', x === b));
  sCap.textContent = 'собираю…'; swap.nodes.res.classList.add('busy');
  await swap.pulse(['preset']);
  await regen(sImg.parentElement, sImg, IMG(b.dataset.img));
  swap.nodes.res.classList.remove('busy');
  sCap.textContent = b.textContent.trim() + ' · 3:4';
  busy = false;
}));
swap.hideNodes();
onSeen(swap.el, () => setTimeout(() => { swap.drawIn(); setTimeout(() => swap.pulse(), 900); }, swap.appear()));

// ---------- 4. Кульминация: запустить рецепт ----------
// Ноды по очереди: в очереди → работает → готово. Данные идут по цепочке,
// в конце собираются три формата с разной композицией. Картинки подготовлены заранее — это видно в плашке.
const run = new Graph(document.getElementById('g-run'));
const rProds = document.getElementById('run-prods'), rFile = document.getElementById('run-file');
const rGo = document.getElementById('run-go'), rCta = document.getElementById('run-cta');
const rSt = document.getElementById('run-st'), rCount = document.getElementById('run-count'), rName = document.getElementById('run-name');
const rSteps = [...document.querySelectorAll('#run-q li')];
const rFrames = [...document.querySelectorAll('#fmts .fm')];
let pick = rProds.querySelector('[aria-checked="true"]'), running = false;
const cap = s => s[0].toUpperCase() + s.slice(1);
const setStep = (li, st) => { li.className = st; li.querySelector('i').textContent = { wait: 'в очереди', work: 'работает', done: 'готово' }[st]; };
function runReset() {
  run.el.classList.remove('live', 'ran');
  Object.values(run.nodes).forEach(n => n.classList.remove('busy', 'done'));
  rSteps.forEach(li => setStep(li, 'wait'));
  rFrames.forEach(f => f.classList.add('empty')); rFrames[0].classList.remove('playing');
  rSt.textContent = 'ждёт запуска'; rCount.textContent = '0 из 3';
  rGo.textContent = 'Запустить сценарий';
  // новый запуск или другой продукт — главной снова становится «Запустить»
  rGo.classList.remove('btn-ghost'); rCta.hidden = true; rGo.parentElement.prepend(rGo);
}
function choose(b) {
  if (running) return;
  pick = b;
  rProds.querySelectorAll('[role="radio"]').forEach(x => x.setAttribute('aria-checked', x === b));
  rName.textContent = b.dataset.name;
  // фон сцены задаёт промпт — показываем его в шагах, чтобы было видно, откуда новая сцена
  document.getElementById('run-prompt').textContent = b.dataset.prompt ? '· ' + b.dataset.prompt : '· фон как на фото';
  document.getElementById('fmts').dataset.fmt = b.dataset.fmt || '';
  runReset();
}
async function runRecipe() {
  if (running) return;
  running = true; rGo.setAttribute('aria-disabled', 'true');
  runReset();
  rGo.textContent = 'Собираю…';
  const { img: src, name } = pick.dataset, own = pick.classList.contains('own');
  // своё фото: название товара мы не знаем, на форматах его не пишем
  document.getElementById('fmts').classList.toggle('own', own);
  document.getElementById('fmts').classList.toggle('tone-light', pick.dataset.tone === 'light' || own);
  // своё фото: на сторис и карточке без названия, на баннере — нейтральное «Новинка»
  rFrames.forEach(f => f.querySelectorAll('.fm-name').forEach(n => (n.textContent = own ? (f.classList.contains('fm-banner') ? 'Новинка' : '') : (pick.dataset.full || cap(name)))));
  rFrames.forEach(f => f.querySelectorAll('.fm-sub').forEach(n => (n.textContent = own ? '' : 'линия «Сияние»')));
  run.el.classList.add('live');
  const [nProd, nRec, nOut] = ['prod', 'recipe', 'out'].map(k => run.nodes[k]);
  nProd.classList.add('done');
  await run.pulse(['prod']);
  nRec.classList.add('busy'); rSt.textContent = 'работает';
  for (const li of rSteps.slice(0, 4)) { setStep(li, 'work'); await wait(620); setStep(li, 'done'); }
  setStep(rSteps[4], 'work');
  await run.pulse(['recipe']);
  nOut.classList.add('busy');
  let k = 0;
  for (const f of rFrames) {
    f.classList.remove('empty');
    // у каждого формата своя сцена (сгенерирована отдельно, средство — настоящее); своё фото — одно на все форматы
    const kind = f.classList.contains('fm-story') ? 'story' : f.classList.contains('fm-card') ? 'card' : 'banner';
    // карточка — та же сцена, что у видео-сторис (одна съёмка, разные форматы; отдельная светлая сцена карточки выбивалась)
    await regen(f.querySelector('.fi'), f.querySelector('img'), pick.dataset.fmt ? `img/sevea/fmt/${pick.dataset.fmt}-${kind === 'card' ? 'story' : kind}.webp` : src);
    if (kind === 'story') f.classList.add('playing'); // сторис — видео: наезд камеры, текст по ходу ролика, полоса времени
    rCount.textContent = ++k + ' из 3';
  }
  setStep(rSteps[4], 'done');
  if (own) rCount.textContent = '3 из 3 · фото как есть';
  nRec.classList.replace('busy', 'done'); nOut.classList.replace('busy', 'done');
  rSt.textContent = 'готово'; run.el.classList.add('ran');
  // после сборки главная кнопка — «Продолжить в Снэпбилде», повторный запуск становится второстепенным
  rCta.hidden = false; rGo.parentElement.prepend(rCta);
  rGo.classList.add('btn-ghost'); rGo.textContent = 'Запустить ещё раз'; rGo.removeAttribute('aria-disabled');
  running = false;
}
rProds.querySelectorAll('[role="radio"]').forEach(b => b.addEventListener('click', () => choose(b)));
rGo.addEventListener('click', runRecipe);
// своё фото: появляется четвёртой миниатюрой и сразу выбирается
const inHint = document.querySelector('#g-run .in-hint');
function addOwn(f) {
  if (!f || running) return;
  if (!f.type.startsWith('image/')) { // не картинка — говорим, а не молчим
    inHint.textContent = 'это не\u00a0картинка, выберите фото'; inHint.classList.add('bad');
    clearTimeout(addOwn.t); addOwn.t = setTimeout(() => { inHint.textContent = 'или перетащите фото сюда'; inHint.classList.remove('bad'); }, 3000);
    return;
  }
  let b = rProds.querySelector('.own');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button'; b.className = 'own'; b.setAttribute('role', 'radio');
    b.dataset.name = 'ваш продукт'; b.innerHTML = '<img alt="Ваше фото">';
    b.addEventListener('click', () => choose(b));
    rProds.insertBefore(b, rProds.querySelector('.up'));
  }
  b.dataset.img = URL.createObjectURL(f);
  b.querySelector('img').src = b.dataset.img;
  choose(b);
}
rFile.addEventListener('change', () => addOwn(rFile.files[0]));
const inNode = run.nodes.prod;
['dragenter', 'dragover'].forEach(t => inNode.addEventListener(t, e => { e.preventDefault(); inNode.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => inNode.addEventListener(t, e => { e.preventDefault(); inNode.classList.remove('over'); }));
inNode.addEventListener('drop', e => addOwn(e.dataTransfer.files[0]));
runReset();
run.hideNodes();
onSeen(run.el, () => setTimeout(() => run.drawIn(), run.appear()));

// ---------- 1б. Соедините ноды сами ----------
// Тянуть провод от выхода (справа) к входу (слева). На телефоне — нажать выход, потом вход.
const link = new Graph(document.getElementById('g-link'));
const NEED = ['prod>preset', 'prompt>preset', 'preset>brand', 'brand>res'];
const NAMES = { prod: 'Продукт', prompt: 'Промпт', preset: 'Пресет', brand: 'Бренд-директор', res: 'Результат' };
// что изменилось после соединения — человек видит смысл шага, а не «данные получены»
const WHY = {
  'prod>preset': 'есть! Товар получил стиль съёмки. Теперь добавьте описание кадра: Промпт → Пресет',
  'prompt>preset': 'есть! Стиль знает, что в кадре. Дальше проверка: Пресет → Бренд-директор',
  'preset>brand': 'есть! Кадр проверят по правилам бренда. Осталось: Бренд-директор → Результат'
};
const done = new Set();
const lMsg = document.getElementById('link-msg'), lSt = document.getElementById('link-st');
const lImg = document.getElementById('link-img'), lState = document.getElementById('link-state');
const steps = [...document.querySelectorAll('#link-steps li')];
const say = (t, cls = '') => { lMsg.textContent = t; lMsg.className = 'link-msg mono ' + cls; };
function linkReset() {
  done.clear();
  link.edges.forEach(e => e.p.classList.add('hide'));
  link.el.querySelectorAll('.port').forEach(p => p.classList.remove('armed', 'target'));
  steps.forEach((s, i) => { s.classList.remove('done'); s.classList.toggle('next', i === 0); });
  link.nodes.prod.querySelector('.port.out').classList.add('hint'); // с чего начать — кружок «Продукта» мягко пульсирует
  lState.className = 'state show'; lSt.textContent = 'пусто';
  say(phone.matches ? 'нажмите кружок «Продукта», потом кружок «Пресета»' : 'потяните провод от кружка «Продукта» к кружку «Пресета»');
}
async function tryConnect(a, b) {
  const key = a + '>' + b, next = NEED[done.size];
  if (done.has(key)) return say('эти ноды уже соединены');
  if (!next) return;
  if (key !== next) {
    const [na, nb] = next.split('>');
    return say(NEED.includes(key) ? `не\u00a0спешите: сначала ${NAMES[na]}\u00a0→ ${NAMES[nb]}` : `так не\u00a0соединить. Следующий шаг: ${NAMES[na]}\u00a0→ ${NAMES[nb]}`, 'bad');
  }
  done.add(key);
  link.nodes.prod.querySelector('.port.out').classList.remove('hint');
  const e = link.wire(a, b); e.classList.remove('hide');
  steps[done.size - 1].classList.add('done'); steps[done.size - 1].classList.remove('next');
  if (steps[done.size]) steps[done.size].classList.add('next');
  link.draw();
  await link.pulse([a]);
  if (done.size < NEED.length) return say(WHY[key], 'good');
  lState.classList.remove('show'); lSt.textContent = 'собираю…';
  await regen(lImg.parentElement, lImg, IMG('studio'));
  lSt.textContent = 'готово';
  say('готово: вы собрали сценарий. Его можно сохранить и повторять для любого товара', 'good');
}
let dragFrom = null, temp = null, armed = null;
const portXY = p => { const r = p.getBoundingClientRect(), c = link.el.getBoundingClientRect(); return [r.left + r.width / 2 - c.left, r.top + r.height / 2 - c.top]; };
link.el.querySelectorAll('.port.out').forEach(p => p.addEventListener('pointerdown', ev => {
  ev.preventDefault(); ev.stopPropagation();
  dragFrom = p; const [x1, y1] = portXY(p), c = link.el.getBoundingClientRect(), sx = ev.clientX, sy = ev.clientY;
  temp = document.createElementNS(NS, 'path'); temp.setAttribute('class', 'drag-wire'); link.svg.appendChild(temp);
  let last = null;
  const move = e => {
    const x2 = e.clientX - c.left, y2 = e.clientY - c.top, d = Math.max(30, Math.abs(x2 - x1) / 2);
    temp.setAttribute('d', synth() ? cable(x1, y1, x2, y2) : `M${x1} ${y1} C${x1 + d} ${y1},${x2 - d} ${y2},${x2} ${y2}`);
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('#g-link .port.in');
    if (last && last !== t) last.classList.remove('target');
    if (t) t.classList.add('target'); last = t;
  };
  const up = e => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    dragFrom = null; // провод отпустили — подсказка следующего шага снова видна
    temp.remove(); if (last) last.classList.remove('target');
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('#g-link .port.in');
    const a = p.closest('.node').dataset.id;
    if (t) { armed = null; p.classList.remove('armed'); return tryConnect(a, t.closest('.node').dataset.id); }
    if (Math.hypot(e.clientX - sx, e.clientY - sy) < 6) { // нажатие без протягивания — режим «нажми второй кружок»
      link.el.querySelectorAll('.port.armed').forEach(x => x.classList.remove('armed'));
      armed = p; p.classList.add('armed'); say(`${NAMES[a]} выбран. Теперь нажмите кружок слева у\u00a0следующей ноды`);
    }
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}));
link.el.querySelectorAll('.port.in').forEach(p => p.addEventListener('click', () => {
  if (!armed) return;
  const a = armed.closest('.node').dataset.id; armed.classList.remove('armed'); armed = null;
  tryConnect(a, p.closest('.node').dataset.id);
}));
// с клавиатуры: Tab до кружка, Enter или пробел на выходе — выбрать, на входе следующей ноды — соединить
link.el.querySelectorAll('.port').forEach(p => {
  const out = p.classList.contains('out'), name = NAMES[p.closest('.node').dataset.id];
  p.tabIndex = 0; p.setAttribute('role', 'button');
  p.setAttribute('aria-label', out ? `Выход ноды «${name}»: выбрать` : `Вход ноды «${name}»: соединить`);
  p.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!out) return p.click();
    link.el.querySelectorAll('.port.armed').forEach(x => x.classList.remove('armed'));
    armed = p; p.classList.add('armed');
    say(`${name} выбран. Теперь выберите вход следующей ноды`);
  });
});
// подсказка жеста: пунктир от выхода к входу следующего шага, по нему едет точка «тяни отсюда сюда»
const ghost = document.createElementNS(NS, 'path'), finger = document.createElementNS(NS, 'circle');
ghost.setAttribute('class', 'ghost-wire'); finger.setAttribute('class', 'ghost-dot'); finger.setAttribute('r', 5);
link.svg.append(ghost, finger);
(function ghostLoop(now) {
  const next = NEED[done.size], show = !!next && !dragFrom && !armed;
  ghost.classList.toggle('show', show); finger.classList.toggle('show', show && !reduce);
  if (show) {
    const [a, b] = next.split('>');
    ghost.setAttribute('d', link.path({ a, b }));
    const len = ghost.getTotalLength(), t = (now % 2000) / 1600; // 1,6 с едет, 0,4 с ждёт у входа
    const pt = ghost.getPointAtLength(len * (1 - Math.pow(1 - Math.min(t, 1), 3)));
    finger.setAttribute('cx', pt.x); finger.setAttribute('cy', pt.y);
  }
  requestAnimationFrame(ghostLoop);
})(0);
document.getElementById('link-reset').addEventListener('click', linkReset);
linkReset();
link.hideNodes();
onSeen(link.el, () => link.appear());

// Оптическое выравнивание половин «01»: верх контура цифры «01» = верх окна, низ подчёркивания «начать заново» = низ окна.
// Считаем по метрикам шрифта, а не по рамке строки (у крупной цифры над контуром пустое место).
function opticAlign() {
  const ctx = document.createElement('canvas').getContext('2d');
  const ink = (el, text) => {
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs * 1.2;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(text), half = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
    const base = half + m.fontBoundingBoxAscent; // где базовая линия от верха строки
    return { top: base - m.actualBoundingBoxAscent, base, lh };
  };
  const num = document.querySelector('#link .num'), reset = document.getElementById('link-reset');
  const nums = document.querySelectorAll('.halves .num'); // 01 и 03 — оба по верху окна
  if (!num || narrow.matches) { nums.forEach(n => (n.style.marginTop = '')); reset.style.marginBottom = ''; return; }
  nums.forEach(n => (n.style.marginTop = -ink(n, n.textContent).top + 'px'));
  const r = ink(reset, reset.textContent), under = r.base + 3 + 1; // подчёркивание: отступ 3 px + толщина 1 px
  reset.style.marginBottom = (under - r.lh) + 'px';
}
document.fonts.ready.then(opticAlign); narrow.addEventListener('change', opticAlign);
