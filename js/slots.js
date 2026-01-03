function renderSlots() {
  const root = document.getElementById('slots-root');
  const levels = Object.keys(state.slots)
    .map(n => Number(n))
    .sort((a, b) => a - b);

  root.innerHTML = `
    <div class="slots-list">
      ${levels
        .map(lvl => {
          const { max, used } = state.slots[lvl];
          return `
            <div class="slot-row" data-level="${lvl}">
              <span class="level">Level ${lvl}</span>
              <button class="btn-xs slot-dec">-</button>
              <span class="count">${used}/${max}</span>
              <button class="btn-xs slot-inc">+</button>
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
      if (e.target.classList.contains('slot-inc')) {
        useSlot(level);
        renderSlots();
      } else if (e.target.classList.contains('slot-dec')) {
        recoverSlot(level);
        renderSlots();
      }
    },
    { once: true }
  );
}

