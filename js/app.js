// Главен файл - инициализира приложението

async function renderAll() {
  await renderCaster();
  renderSlots();
  renderSpells();
  renderDetails();

  const filterEl = document.getElementById('filter-level');
  filterEl.value = String(state.ui.filterLevel);
  filterEl.addEventListener(
    'change',
    e => {
      const lvl = Number(e.target.value) || 0;
      setFilterLevel(lvl);
      renderSpells();
    },
    { once: true }
  );

  const btnLoad = document.getElementById('btn-load-spells');
  btnLoad.addEventListener(
    'click',
    () => {
      loadSpellsForCurrentFilter();
    },
    { once: true }
  );
}

document.addEventListener('DOMContentLoaded', renderAll);

