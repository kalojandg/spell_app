function updatePreparedCounter() {
  const counter = document.getElementById('prepared-counter');
  if (counter) {
    const max = getMaxPreparedSpells();
    counter.textContent = `${getPreparedCount()} / ${max !== null ? max : '∞'}`;
  }
}

function updateKnownCounter() {
  const counter = document.getElementById('known-counter');
  if (counter) {
    const max = getMaxKnownSpells();
    counter.textContent = `${getKnownCount()} / ${max !== null ? max : '∞'}`;
  }
}

function getSpellCounterHTML() {
  const type = getSpellcastingType();
  
  if (type === 'known') {
    // Known casters показват Known Spells counter
    const maxKnown = getMaxKnownSpells();
    return `Known Spells: <strong id="known-counter">${getKnownCount()} / ${maxKnown !== null ? maxKnown : '∞'}</strong>`;
  } else {
    // Prepared casters показват Prepared Spells counter
    const maxPrepared = getMaxPreparedSpells();
    return `Prepared Spells: <strong id="prepared-counter">${getPreparedCount()} / ${maxPrepared !== null ? maxPrepared : '∞'}</strong>`;
  }
}

async function renderCaster() {
  const root = document.getElementById('caster-root');
  const { className, level, abilityMod, profBonus } = state.caster;

  // Извличаме prof bonus от API
  let currentProfBonus = profBonus;
  try {
    currentProfBonus = await fetchProficiencyBonus(className, level);
    // Обновяваме state само ако е различно
    if (state.caster.profBonus !== currentProfBonus) {
      state.caster.profBonus = currentProfBonus;
      saveState();
    }
  } catch (err) {
    console.error('Грешка при зареждане на prof bonus:', err);
    // Използваме текущата стойност при грешка
  }

  root.innerHTML = `
    <div class="row">
      <label style="flex:1;">
        Клас
        <select id="caster-class">
          <option value="bard" ${className === 'bard' ? 'selected' : ''}>Bard</option>
          <option value="cleric" ${className === 'cleric' ? 'selected' : ''}>Cleric</option>
          <option value="druid" ${className === 'druid' ? 'selected' : ''}>Druid</option>
          <option value="paladin" ${className === 'paladin' ? 'selected' : ''}>Paladin</option>
          <option value="ranger" ${className === 'ranger' ? 'selected' : ''}>Ranger</option>
          <option value="sorcerer" ${className === 'sorcerer' ? 'selected' : ''}>Sorcerer</option>
          <option value="warlock" ${className === 'warlock' ? 'selected' : ''}>Warlock</option>
          <option value="wizard" ${className === 'wizard' ? 'selected' : ''}>Wizard</option>
        </select>
      </label>
      <label style="width:4.5rem;">
        Ниво
        <input id="caster-level" type="number" min="1" max="20" value="${level}">
      </label>
    </div>
    <div class="row" style="margin-top:0.25rem;">
      <label style="width:5.5rem;">
        Ability mod
        <input id="caster-ability-mod" type="number" value="${abilityMod}">
      </label>
      <label style="width:5.5rem;">
        Prof
        <span id="caster-prof-bonus">${currentProfBonus}</span>
      </label>
    </div>
    <div class="derived">
      Spell Attack Bonus: <strong>+${getSpellAttackBonus()}</strong><br>
      Spell Save DC: <strong>${getSpellSaveDC()}</strong><br>
      ${getSpellCounterHTML()}
    </div>
  `;

  root.querySelector('#caster-class').addEventListener('change', async e => {
    const newClass = e.target.value;
    const oldClass = state.caster.className;
    
    // Проверяваме дали има научени магии
    const hasKnownSpells = getKnownCount() > 0;
    
    if (hasKnownSpells) {
      // Показваме confirmation dialog
      const confirmed = confirm(
        `Смяната на класа от ${oldClass.charAt(0).toUpperCase() + oldClass.slice(1)} към ${newClass.charAt(0).toUpperCase() + newClass.slice(1)} ще изтрие всички научени и подготвени магии.\n\nСигурни ли сте?`
      );
      
      if (!confirmed) {
        // Връщаме старата стойност
        e.target.value = oldClass;
        return;
      }
      
      // Изчистваме всичко - включително known/prepared
      clearAllSpells();
    } else {
      // Няма known магии, но трябва да изчистим заредените магии за стария клас
      // Изчистваме loadedForLevel за всички магии
      for (const index of Object.keys(state.spells)) {
        state.spells[index].loadedForLevel = null;
        state.spells[index].data = null;
      }
      state.ui.filterLevel = null;
      state.ui.expandedSpellIndex = null;
      state.ui.searchQuery = '';
      saveState();
    }
    
    // Reset-ваме UI елементите
    const filterEl = document.getElementById('filter-level');
    if (filterEl) filterEl.value = '';
    const searchEl = document.getElementById('spell-search');
    if (searchEl) searchEl.value = '';
    
    // Reset-ваме слотовете (като дълга почивка)
    for (const level of Object.keys(state.slots)) {
      state.slots[level].used = 0;
    }
    
    updateCaster({ className: newClass });
    await renderCaster();
    await renderSlots();
    updateSpellLevelDropdown();
    renderSpells();
    renderKnownSpells();
  });
  root.querySelector('#caster-level').addEventListener('change', async e => {
    const val = Number(e.target.value) || 1;
    updateCaster({ level: val });
    await renderCaster();
    await renderSlots();
    updateSpellLevelDropdown();
  });
  root.querySelector('#caster-ability-mod').addEventListener('change', e => {
    const val = Number(e.target.value) || 0;
    updateCaster({ abilityMod: val });
    renderCaster();
  });
}

