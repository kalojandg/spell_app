// Главен файл - инициализира приложението

async function renderAll() {
  await renderCaster();
  await renderSlots();
  // Показваме празен акордеон при инициализация
  renderSpells();
  renderDetails();

  const filterEl = document.getElementById('filter-level');
  filterEl.value = String(state.ui.filterLevel);
  // Премахваме стария listener и добавяме нов
  const newFilterEl = filterEl.cloneNode(true);
  filterEl.parentNode.replaceChild(newFilterEl, filterEl);
  newFilterEl.addEventListener('change', async e => {
    const lvl = Number(e.target.value) || 0;
    setFilterLevel(lvl);
    // Автоматично зареждаме магии при промяна на нивото и изчистваме старите
    await loadSpellsForCurrentFilter(true);
  });
}

document.addEventListener('DOMContentLoaded', renderAll);

