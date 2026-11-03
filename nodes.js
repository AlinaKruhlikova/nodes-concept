// Снэпбилд · ноды — у каждой ноды свой вид по роли (3.11): промпт — цитата, пресет — палитра,
// проверки — прежним текстом (чек-листы Алине не понравились). Запускается до app.js, чтобы полотна мерили ноды уже в новом виде.
(() => {
  const SW = {
    'Северное сияние': ['#1F2A36', '#2FA37E', '#8E7BD6', '#E9E4DA'],
    'Морошка': ['#E98B2A', '#F3EBDD', '#7A8F5A', '#1F2A36'],
    'Текстура': ['#EDE6DA', '#CFC3B0', '#9C8B74', '#1F2A36']
  };
  const swatches = name => `<span class="sws" aria-hidden="true">${(SW[name] || SW['Северное сияние']).map(c => `<i style="background:${c}"></i>`).join('')}</span>`;

  document.querySelectorAll('.canvas .node').forEach(n => {
    const id = n.dataset.id, p = n.querySelector('.node-b > p.mono');
    if (id === 'prompt' && p) { p.className = 'quote'; p.innerHTML = '«' + p.innerHTML + '»'; }
    if (id === 'preset' && p) {
      const [name, ...rest] = p.textContent.split(' · ');
      p.outerHTML = `<div class="pal">${swatches(name)}<b>${name}</b><span class="mono">${rest.join(' · ')}</span></div>`;
    }
  });
  // в блоке «Поменяйте одну ноду» у каждого пресета своя палитра
  document.querySelectorAll('#g-swap .presets button').forEach(b => b.insertAdjacentHTML('afterbegin', swatches(b.textContent.trim())));
  // зелёная шапка — только у ноды, с которой сейчас работают
  document.querySelector('#g-swap [data-id=preset]')?.classList.add('act');
})();
