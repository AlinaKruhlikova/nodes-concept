// Снэпбилд · ноды — первый экран «стена, полоска, сценарий» (3.11, идея Алины)
// Стена материалов «Севеи» плывёт во всю ширину, оффер на плашке по центру.
// Прокрутка или первое наведение — плашка уезжает наверх и становится тонкой полоской под шапкой.
// Наведение на картинку — её сценарий рядом; нажатие — картинка разбирается на ноды, в «Продукте» можно сменить продукт.
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = () => innerWidth < 768;
const clamp = v => Math.max(0, Math.min(1, v)), lerp = (a, b, t) => a + (b - a) * t, ease = t => 1 - Math.pow(1 - t, 3);
const wire = (a, b) => {
  if (b[0] - a[0] > 40) { const d = (b[0] - a[0]) / 2; return `M${a[0]} ${a[1]} C${a[0] + d} ${a[1]},${b[0] - d} ${b[1]},${b[0]} ${b[1]}`; }
  const d = Math.max(40, Math.abs(b[1] - a[1]) / 2); return `M${a[0]} ${a[1]} C${a[0]} ${a[1] + d},${b[0]} ${b[1] - d},${b[0]} ${b[1]}`;
};
const hero = document.getElementById('hero'), wall = document.getElementById('wall'), plate = document.getElementById('plate'), pf = document.getElementById('pf'), pb = document.getElementById('pb');

// ---------- данные: продукты, сцены (продукт + пресет), промпты ----------
const P = { gel: ['p-gel', 'Мягкий гель для умывания'], serum: ['p-serum', 'Увлажняющая сыворотка'], spf: ['p-spf', 'Флюид SPF 50'], cream: ['p-cream', 'Барьерный крем с морошкой'], mask: ['p-mask', 'Ночной питательный крем-маска'],
  stick: ['p-stick', 'Стик от ветра и мороза'], hand: ['p-hand', 'Крем для рук'], renew: ['p-renew', 'Обновляющая сыворотка'], anti: ['p-anti', 'Сыворотка-антиоксидант с морошкой'] };
const S = { s13: ['mask', 'Северное сияние'], s00: ['gel', 'Гравюра'], s19: ['stick', 'Морошка'], s05: ['serum', 'Северные травы'], s21: ['hand', 'Северное сияние'], s08: ['spf', 'Текстура'],
  s14: ['mask', 'Морошка'], s27: ['anti', 'Морошка'], s06: ['spf', 'Гравюра'], s24: ['renew', 'Северное сияние'], s16: ['mask', 'Текстура'], s11: ['cream', 'Морошка'],
  s18: ['stick', 'Северное сияние'], s01: ['gel', 'Северные травы'], s22: ['hand', 'Морошка'], s04: ['serum', 'Гравюра'], s25: ['renew', 'Морошка'], s07: ['spf', 'Северные травы'],
  s12: ['mask', 'Северное сияние'], s28: ['anti', 'Текстура'], s20: ['stick', 'Морошка'], s23: ['hand', 'Текстура'], s15: ['mask', 'Морошка'], s26: ['renew', 'Текстура'], s17: ['mask', 'Текстура'] };
const PROMPT = { 'Северное сияние': 'Средство на камне, за ним северное сияние и горы гравюрой', 'Морошка': 'Средство на камне среди морошки и мха, тёплый свет',
  'Гравюра': 'Средство на снегу, за ним горы и озеро гравюрой', 'Северные травы': 'Средство среди северных цветов и трав, мягкий свет', 'Текстура': 'Средство рядом с мазком текстуры на бежевом камне' };
const FMT = ['сторис', 'карточка', 'видео', 'баннер', 'пост'], keys = Object.keys(S);
const sceneOf = (prod, preset) => keys.find(k => S[k][0] === prod && S[k][1] === preset);
const score = k => (96 + k.charCodeAt(2) % 4) + ' %';

// ---------- стена ----------
let cols = [];
function buildWall() {
  const n = phone() ? 3 : 6; wall.innerHTML = ''; cols = []; wall.style.gridTemplateColumns = `repeat(${n},1fr)`;
  for (let c = 0; c < n; c++) {
    const col = document.createElement('div'); col.className = 'col'; wall.appendChild(col);
    const mine = keys.filter((_, i) => i % n === c);
    [...mine, ...mine, ...mine, ...mine].forEach((k, j) => col.insertAdjacentHTML('beforeend',
      `<button class="tile" type="button" data-s="${k}" aria-label="Сценарий:${P[S[k][0]][1]}, ${S[k][1]}"><img src="img/sevea/w/${k}.webp" alt="" decoding="async"><span class="tg${FMT[(j + c) % FMT.length] === 'видео' ? ' vid' : ''}">${FMT[(j + c) % FMT.length]}</span></button>`));
    cols.push({ el: col, y: -(c * 130) - 300, v: (c % 2 ? .24 : -.24) * (1 + (c % 3) * .12) });
  }
}

// ---------- плашка: по центру → полоска под шапкой ----------
let c = 0, touched = false, mode = 'wall';
function plateFrame() {
  const W = hero.clientWidth, H = hero.clientHeight, cw = Math.min(1360, W - (phone() ? 32 : 80)), L = (W - cw) / 2;
  // оффер сворачивается только прокруткой (наведение больше не сворачивает), плавно за 40 % высоты экрана
  let to = clamp(scrollY / (innerHeight * .4)); if (mode !== 'wall') to = 1;
  c += (to - c) * (reduce ? 1 : .14);
  const k = ease(clamp(c)), fw = Math.min(880, W - 32), fh = pf.offsetHeight, bh = phone() ? 52 : 64, top = 8;
  // полоска закреплена под шапкой, пока виден первый экран; с началом второго блока уезжает вместе с ним
  const head = document.querySelector('.top').offsetHeight, pin = Math.max(top, Math.min(H - bh - top, head + top - hero.getBoundingClientRect().top));
  const x = lerp((W - fw) / 2, L, k), y = lerp((H - fh) / 2, pin, k), w = lerp(fw, cw, k), h = lerp(fh, bh, k);
  pinBottom = y + h;
  Object.assign(plate.style, { transform: `translate(${x}px,${y}px)`, width: w + 'px', height: h + 'px', borderRadius: lerp(24, 999, k) + 'px' });
  pf.style.width = fw + 'px'; pf.style.left = (w - fw) / 2 + 'px'; pf.style.top = (h - fh) / 2 + 'px';
  pf.style.opacity = 1 - clamp(k * 2.2); pf.style.visibility = k > .5 ? 'hidden' : '';
  pb.style.opacity = clamp((k - .55) * 2.2); pb.style.visibility = k < .5 ? 'hidden' : '';
  return top + bh;
}

// ---------- сценарий при наведении ----------
const rec = document.getElementById('rec'), rsvg = rec.querySelector('svg');
let hover = null, stripBottom = 72, pinBottom = 72; // stripBottom — низ полоски в верхнем положении (для раскладки сценария), pinBottom — где она сейчас
function place(tile) {
  const o = hero.getBoundingClientRect(), r = tile.getBoundingClientRect(), [pk, preset] = S[tile.dataset.s], prod = P[pk];
  if (rec.dataset.s !== tile.dataset.s) {
    rec.dataset.s = tile.dataset.s; rec.querySelectorAll('.n').forEach(n => n.remove());
    rec.insertAdjacentHTML('beforeend', `<div class="n"><div class="n-h"><i></i>Продукт</div><div class="im"><img src="img/sevea/${prod[0]}.webp" alt=""></div><div class="n-b" style="padding-top:0">${prod[1]}</div><span class="pt out"></span></div>
      <div class="n dec"><div class="n-h"><i></i>Пресет</div><div class="n-b">${preset} · 4:5</div><span class="pt in"></span><span class="pt out"></span></div>
      <div class="n dec"><div class="n-h"><i></i>Бренд-директор</div><div class="n-b">цвета и&nbsp;логотип<b>${score(tile.dataset.s)}</b></div><span class="pt in"></span><span class="pt out"></span></div>`);
  }
  // столбик из трёх нод сбоку от картинки: слева, если помещается, иначе справа
  const ns = [...rec.querySelectorAll('.n')], w = phone() ? 112 : 168, gap = phone() ? 12 : 24, vg = 16;
  ns.forEach(n => (n.style.width = w + 'px'));
  const tl = r.left - o.left, tr = r.right - o.left, left = tl - gap - w >= 8, x = left ? tl - gap - w : Math.min(tr + gap, o.width - 8 - w);
  const hs = ns.map(n => n.offsetHeight), Hh = hs.reduce((a, b) => a + b, 0) + 2 * vg, ty = r.top - o.top + r.height / 2;
  let y = Math.max(pinBottom + 16, Math.min(o.height - 16 - Hh, ty - Hh / 2)); const bx = [];
  ns.forEach((n, i) => { n.style.transform = `translate(${x}px,${y}px)`; bx.push([y, hs[i]]); y += hs[i] + vg; });
  let d = '';
  for (let i = 0; i < 2; i++) d += `<path d="M${x + w / 2} ${bx[i][0] + bx[i][1]} L${x + w / 2} ${bx[i + 1][0]}"/>`;
  const ex = left ? x + w : x, ey = bx[2][0] + bx[2][1] / 2, tx = left ? tl : tr, kk = left ? 1 : -1;
  d += `<path d="M${ex} ${ey} C${ex + kk * 24} ${ey},${tx - kk * 24} ${ty},${tx} ${ty}"/>`;
  rsvg.innerHTML = d;
}
const clearHover = () => { if (hover) hover.classList.remove('is'); hover = null; wall.classList.remove('focus'); rec.classList.remove('on'); };
wall.addEventListener('pointerover', e => { const t = e.target.closest('.tile'); if (!t || t === hover || mode !== 'wall') return;
  if (c < .95) return; // пока оффер развёрнут, рецепт плитки не показываем: оффер читают первым
  if (hover) hover.classList.remove('is'); hover = t; t.classList.add('is'); wall.classList.add('focus'); rec.classList.add('on'); place(t); });
wall.addEventListener('pointerleave', clearHover);

// ---------- сценарий картинки: нажатие → картинка разбирается на ноды ----------
const R = document.getElementById('recipe'), N = {}; R.querySelectorAll('.n').forEach(n => (N[n.dataset.id] = n));
const t2 = document.getElementById('t2'), svg = document.getElementById('wires'), NSV = 'http://www.w3.org/2000/svg';
const ORDER = ['prod', 'ref', 'prompt', 'preset', 'brand'];
const EDGES = [['prod', 'preset'], ['ref', 'preset'], ['prompt', 'preset'], ['preset', 'brand'], ['brand', 'res']], SIG = [0, 3, 4];
const paths = EDGES.map(() => { const p = document.createElementNS(NSV, 'path'); p.setAttribute('pathLength', 1); svg.appendChild(p); return p; });
const dot = document.createElementNS(NSV, 'circle'); dot.setAttribute('r', 6); svg.appendChild(dot);
const $ = id => document.getElementById(id);
let r = 0, rTo = 0, from = null, cur = null, sig0 = 0;
function fill(scene, keepImg) {
  const [pk, preset] = S[scene]; cur = { scene, pk, preset };
  $('r-prod').src = `img/sevea/${P[pk][0]}.webp`; $('r-prod').alt = P[pk][1];
  const ref = keys.find(k => S[k][1] === preset && S[k][0] !== pk) || scene; $('r-ref').src = `img/sevea/${ref}.webp`;
  $('r-prompt').textContent = PROMPT[preset];
  $('r-preset').textContent = preset.toLowerCase() + ' · 4:5 · 4K';
  if (!keepImg) { $('r-img').src = `img/sevea/${scene}.webp`; $('r-img').alt = P[pk][1] + ', ' + preset; }
  $('r-name').textContent = P[pk][1].toLowerCase();
  // в «Продукте» — только продукты, для которых у этого пресета есть сцена
  const sw = $('r-swap'); sw.innerHTML = '';
  Object.keys(P).filter(p => sceneOf(p, preset)).forEach(p => sw.insertAdjacentHTML('beforeend',
    `<button type="button" data-p="${p}" aria-pressed="${p === pk}" aria-label="${P[p][1]}"><img src="img/sevea/${P[p][0]}.webp" alt=""></button>`));
}
$('r-swap').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.p === cur.pk) return;
  const scene = sceneOf(b.dataset.p, cur.preset); fill(scene, true);
  sig0 = performance.now(); $('r-score').textContent = 'проверяю…';
  // сигнал проходит сценарий, и картинка пересобирается
  setTimeout(() => { const img = $('r-img'), res = N.res; res.style.setProperty('--ph', res.querySelector('.pic').offsetHeight + 'px');
    res.classList.remove('gen'); void res.offsetWidth; res.classList.add('gen'); img.style.opacity = 0;
    setTimeout(() => { img.src = `img/sevea/${scene}.webp`; img.alt = P[S[scene][0]][1] + ', ' + S[scene][1]; img.style.opacity = 1; $('r-score').textContent = score(scene); }, reduce ? 0 : 300); }, reduce ? 0 : 900);
});
// в сценарии кнопка полоски ведёт обратно к стене — одна кнопка вместо двух
const pbHint = $('pb-hint'), pbBtn = $('pb-btn');
const barText = on => { pbHint.innerHTML = on ? 'сценарий одной картинки из&nbsp;стены' : 'наведите&nbsp;— покажем сценарий, нажмите&nbsp;— разберём';
  pbBtn.textContent = on ? (phone() ? 'Назад' : 'Все материалы') : (phone() ? 'Разобрать' : 'Разобрать картинку'); };
barText(false);
function open(tile) {
  const o = hero.getBoundingClientRect(), b = tile.getBoundingClientRect();
  from = { el: tile, x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height };
  clearHover(); fill(tile.dataset.s); mode = 'recipe'; rTo = 1; touched = true; tile.style.visibility = 'hidden'; barText(true);
  $('r-score').textContent = '—';
}
function close() { rTo = 0; mode = 'closing'; R.classList.remove('live'); t2.classList.remove('on'); barText(false); }
wall.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t && mode === 'wall') open(t); });
// «Разобрать картинку» — картинка ближе всех к середине экрана
document.querySelectorAll('#hero [data-go]').forEach(b => b.addEventListener('click', () => {
  if (mode === 'recipe') return close();
  if (mode !== 'wall') return;
  const o = hero.getBoundingClientRect(), cx = o.left + o.width / 2, cy = o.top + o.height / 2 + 60;
  let best = null, bd = 1e9; wall.querySelectorAll('.tile').forEach(t => { const q = t.getBoundingClientRect(), d = Math.hypot(q.left + q.width / 2 - cx, q.top + q.height / 2 - cy); if (d < bd) { bd = d; best = t; } });
  open(best);
}));
function layout(W, H, top) {
  if (phone()) {
    const m = 16, w = (W - 2 * m - 16) / 3, ry = top + 330, rw = Math.min(W - 2 * m, (H - ry - 64) / 1.25);
    return { prod: [m, top, w], ref: [m + w + 8, top, w], prompt: [m + 2 * (w + 8), top, w], preset: [m, top + 210, (W - 2 * m - 8) / 2], brand: [W / 2 + 4, top + 210, (W - 2 * m - 8) / 2], res: [W / 2 - rw / 2, ry, rw] };
  }
  const cw = Math.min(1360, W - 80), L = (W - cw) / 2, bot = H - 40, rw = Math.min(380, (bot - top) / 1.25 - 8), rh = rw * 1.25 + 40;
  return { prod: [L, top, 216], ref: [L + cw * .19, top + 230, 184], prompt: [L + cw * .19, top, 216], preset: [L + cw * .38, top + 150, 216], brand: [L + cw * .55, top + 40, 232], res: [L + cw - rw, top + (bot - top - rh) / 2, rw] };
}
const port = (el, out) => { const q = el.getBoundingClientRect(), o = hero.getBoundingClientRect();
  return phone() ? [q.left - o.left + q.width / 2, out ? q.bottom - o.top : q.top - o.top] : [out ? q.right - o.left : q.left - o.left, q.top - o.top + q.height / 2]; };
function recipeFrame() {
  r += (rTo - r) * (reduce ? 1 : .06); if (Math.abs(rTo - r) < .002) r = rTo;
  if (mode === 'closing' && r === 0) { mode = 'wall'; if (from) from.el.style.visibility = ''; }
  if (mode === 'wall' && r === 0) { N.res.style.opacity = 0; return; }
  const W = hero.clientWidth, H = hero.clientHeight, cw = Math.min(1360, W - 80), L = phone() ? 16 : (W - cw) / 2;
  const t2top = stripBottom + (phone() ? 24 : 40);
  t2.style.width = phone() ? (W - 32) + 'px' : (cw * 8 / 12) + 'px'; t2.style.transform = `translate(${L}px,${t2top}px)`;
  const F = layout(W, H, t2top + t2.offsetHeight + (phone() ? 24 : 40));
  wall.style.opacity = 1 - clamp(r * 3);
  const k = ease(clamp(r / .4)), [rx, ry, rw] = F.res, rh = rw * 1.25 + 40, f0 = from || { x: rx, y: ry, w: rw, h: rh };
  const x = lerp(f0.x, rx, k), y = lerp(f0.y, ry, k), w = lerp(f0.w, rw, k), h = lerp(f0.h, rh, k);
  Object.assign(N.res.style, { transform: `translate(${x}px,${y}px)`, width: w + 'px', height: h + 'px', opacity: r > .001 ? 1 : 0 });
  const hh = N.res.querySelector('.n-h'); hh.style.height = (40 * k) + 'px'; hh.style.padding = k < .02 ? '0 12px' : '';
  const cx = x + w / 2, cy = y + h / 2;
  ORDER.forEach((id, i) => { const a = ease(clamp((r - .25 - i * .05) / .3)), [fx, fy, fw] = F[id], n = N[id]; n.style.width = fw + 'px';
    n.style.transform = `translate(${lerp(cx - fw / 2, fx, a)}px,${lerp(cy - n.offsetHeight / 2, fy, a)}px) scale(${lerp(.3, 1, a)})`; n.style.opacity = a; });
  t2.style.opacity = ease(clamp((r - .4) / .3));
  if (r > .95 && mode === 'recipe') { R.classList.add('live'); t2.classList.add('on'); }
  const wd = clamp((r - .55) / .3);
  EDGES.forEach(([a, b], i) => { paths[i].setAttribute('d', wire(port(N[a], 1), port(N[b], 0))); paths[i].style.strokeDasharray = 1; paths[i].style.strokeDashoffset = 1 - clamp(wd * 1.4 - i * .1); });
  // сигнал: при раскрытии и после каждой смены продукта
  if (r > .85 && mode === 'recipe' && !sig0) { sig0 = performance.now(); setTimeout(() => ($('r-score').textContent = score(cur.scene)), reduce ? 0 : 700); }
  const s = sig0 && !reduce ? (performance.now() - sig0) / 900 : 2;
  if (s >= 0 && s < 1 && mode === 'recipe') { const seg = Math.min(2, Math.floor(s * 3)), f = s * 3 - seg, p = paths[SIG[seg]], pt = p.getPointAtLength(p.getTotalLength() * f);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.style.opacity = 1; } else dot.style.opacity = 0;
  N.res.classList.toggle('lit', mode === 'recipe' && s >= 1);
  if (mode !== 'recipe') sig0 = 0;
}

function loop() {
  stripBottom = plateFrame();
  // стена стоит, пока первый экран не виден — не тратим кадры
  if (mode === 'wall' && scrollY < hero.offsetHeight + 200) cols.forEach(cl => { if (!reduce && !(hover && cl.el.contains(hover))) cl.y += cl.v;
    const h = cl.el.scrollHeight / 4; if (cl.y < -2 * h) cl.y += h; if (cl.y > -h) cl.y -= h; cl.el.style.transform = `translateY(${cl.y}px)`; });
  if (hover) place(hover);
  recipeFrame();
  requestAnimationFrame(loop);
}
let lastPhone = phone();
addEventListener('resize', () => { if (phone() !== lastPhone) { lastPhone = phone(); buildWall(); barText(mode === 'recipe'); } });
document.fonts.ready.then(() => { buildWall(); requestAnimationFrame(loop); });
})();
