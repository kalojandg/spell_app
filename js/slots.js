async function renderSlots() {
  const root = document.getElementById('slots-root');
  const { className, level } = state.caster;

  // Извличаме spell slots от API
  try {
    const apiSlots = await fetchSpellSlots(className, level);
    // Обновяваме state.slots с новите максимални стойности
    // Запазваме използваните слотове, но обновяваме максималните
    for (const [slotLevel, slotData] of Object.entries(apiSlots)) {
      const lvl = Number(slotLevel);
      if (state.slots[lvl]) {
        // Запазваме използваните, но обновяваме максималните
        state.slots[lvl].max = slotData.max;
        // Валидация: използваните не могат да са повече от максималните
        if (state.slots[lvl].used > state.slots[lvl].max) {
          state.slots[lvl].used = state.slots[lvl].max;
        }
      } else {
        state.slots[lvl] = slotData;
      }
    }
    // Премахваме слотове които вече не са налични на това ниво
    for (const slotLevel of Object.keys(state.slots)) {
      const lvl = Number(slotLevel);
      if (!apiSlots[lvl]) {
        delete state.slots[lvl];
      }
    }
    saveState();
  } catch (err) {
    console.error('Грешка при зареждане на spell slots:', err);
    // При грешка използваме текущите стойности
  }

  const levels = Object.keys(state.slots)
    .map(n => Number(n))
    .sort((a, b) => a - b);

  if (levels.length === 0) {
    root.innerHTML = '<div class="small">Няма налични spell slots за това ниво.</div>';
    return;
  }

  root.innerHTML = `
    <div class="slots-list">
      ${levels
        .map(lvl => {
          const { max, used } = state.slots[lvl];
          const remaining = max - used;
          const isFull = remaining === 0;
          const isEmpty = remaining === max;
          
          return `
            <div class="slot-row ${isFull ? 'slot-full' : ''} ${isEmpty ? 'slot-empty' : ''}" data-level="${lvl}">
              <span class="level">Level ${lvl}</span>
              <div class="slot-controls">
                <button class="btn-slot-use" ${isFull ? 'disabled' : ''} title="Използвай slot">
                  <span class="slot-icon">⚡</span>
                </button>
                <span class="count ${isFull ? 'count-full' : ''}">
                  <span class="remaining">${remaining}</span>
                  <span class="separator">/</span>
                  <span class="max">${max}</span>
                </span>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  root.addEventListener(
    'click',
    e => {
      const row = e.target.closest('.slot-row');
      if (!row) return;
      const level = Number(row.dataset.level);
      const button = e.target.closest('.btn-slot-use');
      
      if (button && !button.disabled) {
        useSlot(level);
        renderSlots();
      }
    },
    { once: true }
  );
}

