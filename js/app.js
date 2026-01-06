// Главен файл - инициализира приложението

async function renderAll() {
  await renderCaster();
  await renderSlots();
  // Показваме празен акордеон при инициализация
  renderSpells();
  renderDetails();

  const filterEl = document.getElementById('filter-level');
  const searchEl = document.getElementById('spell-search');
  
  // Задаваме "Изберете" като избрана опция
  filterEl.value = state.ui.filterLevel !== null ? String(state.ui.filterLevel) : '';
  // Изчистваме търсенето при зареждане
  searchEl.value = '';
  
  // Премахваме стария listener и добавяме нов
  const newFilterEl = filterEl.cloneNode(true);
  filterEl.parentNode.replaceChild(newFilterEl, filterEl);
  newFilterEl.addEventListener('change', async e => {
    const value = e.target.value;
    // Изчистваме търсенето при смяна на нивото
    searchEl.value = '';
    setSearchQuery('');
    
    if (value === '') {
      // Ако е избрано "Изберете", не зареждаме магии
      setFilterLevel(null);
      // Изчистваме акордеона и магиите от state
      state.ui.expandedSpellIndex = null;
      // Изчистваме всички магии от state
      state.spells = {};
      saveState();
      renderSpells();
    } else {
      const lvl = Number(value) || 0;
      setFilterLevel(lvl);
      // Изчистваме всички магии и зареждаме нови от API
      await loadSpellsForCurrentFilter();
    }
  });
  
  // Event listener за търсене по име
  searchEl.addEventListener('input', e => {
    setSearchQuery(e.target.value);
    renderSpells();
  });
}

// Изчистваме магиите при unload на страницата
window.addEventListener('beforeunload', () => {
  state.spells = {};
  state.ui.expandedSpellIndex = null;
  state.ui.filterLevel = null;
  state.ui.searchQuery = '';
  saveState();
});

document.addEventListener('DOMContentLoaded', renderAll);

