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
      Spell Save DC: <strong>${getSpellSaveDC()}</strong>
    </div>
  `;

  root.querySelector('#caster-class').addEventListener('change', async e => {
    updateCaster({ className: e.target.value });
    await renderCaster();
    await renderSlots();
  });
  root.querySelector('#caster-level').addEventListener('change', async e => {
    const val = Number(e.target.value) || 1;
    updateCaster({ level: val });
    await renderCaster();
    await renderSlots();
  });
  root.querySelector('#caster-ability-mod').addEventListener('change', e => {
    const val = Number(e.target.value) || 0;
    updateCaster({ abilityMod: val });
    renderCaster();
  });
}

