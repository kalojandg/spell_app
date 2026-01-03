function renderSpells() {
  const root = document.getElementById('spells-root');
  const list = Object.entries(state.spells).map(([index, s]) => ({
    index,
    ...s,
  }));

  const level = state.ui.filterLevel;
  const filtered = list.filter(s => {
    if (s.data && typeof s.data.level === 'number') {
      return s.data.level === level;
    }
    // ако още нямаме data, приемаме, че са за избраното ниво (идват от endpoint за това ниво)
    return true;
  });

  if (filtered.length === 0) {
    root.innerHTML = '<div class="small">Няма заредени магии за това ниво.</div>';
    return;
  }

  filtered.sort((a, b) => {
    const nameA = (a.data?.name || a.ref?.name || a.index).toLowerCase();
    const nameB = (b.data?.name || b.ref?.name || b.index).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  root.innerHTML = `
    <div class="spells-container">
      ${filtered
        .map(s => {
          const d = s.data;
          const name = d?.name || s.ref?.name || s.index;
          const lvl = d?.level ?? level;
          const schoolName = d?.school?.name || '';

          const tags = [`Level ${lvl}`];
          if (schoolName) tags.push(schoolName);
          const conc = d?.concentration ? ' · Concentration' : '';
          const rit = d?.ritual ? ' · Ritual' : '';

          return `
            <div class="spell-item" data-index="${s.index}">
              <div class="spell-header">
                <button class="spell-name-btn" type="button">${name}</button>
                <div class="spell-flags">
                  <button class="btn-xs btn-known ${s.known ? 'badge known' : ''}">
                    Known
                  </button>
                  <button class="btn-xs btn-prepared ${s.prepared ? 'badge prepared' : ''}">
                    Prep
                  </button>
                </div>
              </div>
              <div class="spell-tags">
                ${tags.join(' · ')}${conc}${rit}
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  root.querySelector('.spells-container').addEventListener(
    'click',
    e => {
      const item = e.target.closest('.spell-item');
      if (!item) return;
      const index = item.dataset.index;

      if (e.target.classList.contains('spell-name-btn')) {
        handleSelectSpell(index);
      } else if (e.target.classList.contains('btn-known')) {
        toggleSpellKnown(index);
        renderSpells();
      } else if (e.target.classList.contains('btn-prepared')) {
        toggleSpellPrepared(index);
        renderSpells();
      }
    },
    { once: true }
  );
}

async function loadSpellsForCurrentFilter() {
  const errorEl = document.getElementById('spells-error');
  errorEl.textContent = '';
  const { className } = state.caster;
  const level = state.ui.filterLevel;

  try {
    const refs = await fetchClassSpellsAtLevel(className, level);
    refs.forEach(r => {
      upsertSpellRef(r.index, r);
    });
    renderSpells();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Грешка при зареждане на магии.';
  }
}

async function ensureSpellDetails(index) {
  const entry = state.spells[index];
  if (!entry || entry.data) return;

  try {
    const d = await fetchSpellDetails(index);
    upsertSpellData(index, d);
    if (state.ui.selectedSpellIndex === index) {
      renderDetails();
      renderSpells();
    }
  } catch (err) {
    console.error(err);
    const root = document.getElementById('details-root');
    root.textContent = 'Грешка при зареждане на детайли.';
  }
}

function handleSelectSpell(index) {
  selectSpell(index);
  renderDetails();
  ensureSpellDetails(index);
}

