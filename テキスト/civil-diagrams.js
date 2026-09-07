(() => {
  const scenes = Array.from(document.querySelectorAll('.diagram-scene'));
  const search = document.getElementById('diagram-search');
  const group = document.getElementById('diagram-group');
  const expand = document.getElementById('diagram-expand');
  const count = document.getElementById('diagram-count');
  const empty = document.getElementById('diagram-empty');
  const text = new Map(scenes.map(scene => [scene, scene.textContent.normalize('NFKC').toLowerCase()]));
  function filter() {
    const terms = search.value.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
    let matches = 0;
    for (const scene of scenes) {
      const visible = (!group.value || scene.dataset.group === group.value) && terms.every(term => text.get(scene).includes(term));
      scene.hidden = !visible;
      if (visible) {
        matches++;
        if (expand.checked || terms.length) scene.open = true;
      }
    }
    count.textContent = `${matches}図`;
    empty.hidden = matches !== 0;
  }
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const scene = document.getElementById(id);
    if (!scene?.classList.contains('diagram-scene')) return;
    group.value = ''; search.value = ''; filter();
    scene.open = true;
    requestAnimationFrame(() => scene.scrollIntoView({ block: 'start' }));
  }
  search.addEventListener('input', filter);
  group.addEventListener('change', filter);
  expand.addEventListener('change', () => { for (const scene of scenes) if (!scene.hidden) scene.open = expand.checked; });
  window.addEventListener('hashchange', revealHash);
  let printState;
  window.addEventListener('beforeprint', () => { printState = scenes.map(scene => scene.open); scenes.forEach(scene => { if (!scene.hidden) scene.open = true; }); });
  window.addEventListener('afterprint', () => { if (printState) scenes.forEach((scene, i) => { scene.open = printState[i]; }); });
  revealHash();
})();
