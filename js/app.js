// Главен файл - инициализира приложението

// PWA Install prompt
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  updateInstallButton();
});

function updateInstallButton() {
  const btn = document.getElementById('btn-install');
  if (btn) {
    btn.disabled = !deferredPrompt;
  }
}

async function handleInstall() {
  if (!deferredPrompt) {
    alert('Приложението вече е инсталирано или не може да бъде инсталирано в този браузър.');
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  updateInstallButton();
}

// Rest функция - възстановява всички слотове
function handleRest() {
  // Възстановяваме всички слотове до максимума (used = 0)
  for (const level of Object.keys(state.slots)) {
    state.slots[level].used = 0;
  }
  saveState();
  renderSlots();
  
  // Показваме диалог
  alert('Rest complete! Prepare your spells now.');
}

// Export функция
function handleExport() {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    caster: state.caster,
    slots: state.slots,
    spells: {}
  };
  
  // Експортираме само known/prepared магии с техните ref данни
  for (const [index, spell] of Object.entries(state.spells)) {
    if (spell.known || spell.prepared) {
      exportData.spells[index] = {
        ref: spell.ref,
        known: spell.known,
        prepared: spell.prepared
      };
    }
  }
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `spellbook-${state.caster.className}-lvl${state.caster.level}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import функция
function handleImport(file) {
  const reader = new FileReader();
  
  reader.onload = e => {
    try {
      const importData = JSON.parse(e.target.result);
      
      // Валидация
      if (!importData.caster || !importData.spells) {
        throw new Error('Невалиден формат на файла');
      }
      
      // Възстановяваме caster настройките
      if (importData.caster) {
        state.caster = { ...state.caster, ...importData.caster };
      }
      
      // Възстановяваме slots
      if (importData.slots) {
        state.slots = { ...state.slots, ...importData.slots };
      }
      
      // Възстановяваме магиите
      state.spells = {};
      for (const [index, spell] of Object.entries(importData.spells)) {
        state.spells[index] = {
          ref: spell.ref,
          data: null,
          known: spell.known || false,
          prepared: spell.prepared || false,
          loadedForLevel: null
        };
      }
      
      // Reset UI state
      state.ui.filterLevel = null;
      state.ui.expandedSpellIndex = null;
      state.ui.searchQuery = '';
      
      saveState();
      
      // Re-render всичко
      renderAll();
      
      alert('Данните са импортирани успешно!');
    } catch (err) {
      console.error('Import error:', err);
      alert('Грешка при импортиране: ' + err.message);
    }
  };
  
  reader.onerror = () => {
    alert('Грешка при четене на файла');
  };
  
  reader.readAsText(file);
}

async function renderAll() {
  await renderCaster();
  await renderSlots();
  // Показваме празен акордеон при инициализация
  renderSpells();
  renderKnownSpells();
  renderDetails();

  // Обновяваме dropdown опциите
  updateSpellLevelDropdown();

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
      state.ui.expandedSpellIndex = null;
      // Изчистваме loadedForLevel за всички магии (но запазваме known/prepared)
      for (const index of Object.keys(state.spells)) {
        state.spells[index].loadedForLevel = null;
      }
      saveState();
      renderSpells();
    } else {
      const lvl = Number(value) || 0;
      setFilterLevel(lvl);
      await loadSpellsForCurrentFilter();
    }
  });
  
  // Event listener за търсене по име
  searchEl.addEventListener('input', e => {
    setSearchQuery(e.target.value);
    renderSpells();
  });
  
  // Setup Export/Import/Install бутони
  setupHeaderButtons();
  updateInstallButton();
}

function setupHeaderButtons() {
  const restBtn = document.getElementById('btn-rest');
  const exportBtn = document.getElementById('btn-export');
  const importBtn = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');
  const installBtn = document.getElementById('btn-install');
  
  if (restBtn) {
    restBtn.onclick = handleRest;
  }
  
  if (exportBtn) {
    exportBtn.onclick = handleExport;
  }
  
  if (importBtn && importFile) {
    importBtn.onclick = () => importFile.click();
    importFile.onchange = e => {
      if (e.target.files.length > 0) {
        handleImport(e.target.files[0]);
        e.target.value = ''; // Reset за да може да се качи същия файл пак
      }
    };
  }
  
  if (installBtn) {
    installBtn.onclick = handleInstall;
  }
}

// Регистрираме service worker (само в production, не в тестове)
if ('serviceWorker' in navigator && !window.__PLAYWRIGHT_TEST__) {
  // Първо изчистваме стари кешове
  caches.keys().then(keys => {
    keys.forEach(key => {
      if (key !== 'spellbook-v7') {
        caches.delete(key);
      }
    });
  });
  
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // Форсираме обновяване на SW
    reg.update();
  }).catch(err => {
    console.log('SW registration failed:', err);
  });
}

document.addEventListener('DOMContentLoaded', renderAll);

