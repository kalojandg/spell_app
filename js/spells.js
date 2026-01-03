function renderSpells() {
  const root = document.getElementById('spells-root');
  const list = Object.entries(state.spells).map(([index, s]) => ({
    index,
    ...s,
  }));

  const level = state.ui.filterLevel;
  const filtered = list.filter(s => {
    // Ако магията е отворена в акордеона, винаги я показваме
    if (state.ui.expandedSpellIndex === s.index) {
      return true;
    }
    
    // Ако имаме данни, проверяваме нивото
    if (s.data && typeof s.data.level === 'number') {
      return s.data.level === level;
    }
    
    // Ако нямаме данни, проверяваме дали е заредена за текущото ниво
    // Това гарантира че магиите остават видими докато се зареждат детайлите
    if (s.loadedForLevel !== undefined) {
      return s.loadedForLevel === level;
    }
    
    // Ако няма нито данни, нито loadedForLevel, не показваме магията
    return false;
  });

  if (filtered.length === 0) {
    root.innerHTML = '<div class="small">Изберете ниво за да заредите магии.</div>';
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

          const isExpanded = state.ui.expandedSpellIndex === s.index;
          const hasData = !!d;

          return `
            <div class="spell-item ${isExpanded ? 'spell-expanded' : ''}" data-index="${s.index}">
              <div class="spell-header" data-spell-index="${s.index}" style="cursor: pointer;">
                <span class="spell-name">${name}</span>
                <div class="spell-flags">
                  <button class="btn-xs btn-known ${s.known ? 'badge known' : ''}" type="button">
                    Known
                  </button>
                  <button class="btn-xs btn-prepared ${s.prepared ? 'badge prepared' : ''}" type="button">
                    Prep
                  </button>
                </div>
              </div>
              <div class="spell-tags">
                ${tags.join(' · ')}${conc}${rit}
              </div>
              ${isExpanded ? `
                <div class="spell-details">
                  ${hasData ? renderSpellDetailsContent(d) : '<div class="small">Зареждане на детайли...</div>'}
                </div>
              ` : ''}
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  // Event delegation за всички кликвания
  // Премахваме стария listener ако съществува, за да избегнем дублиране
  const container = root.querySelector('.spells-container');
  if (container) {
    // Клонираме контейнера за да премахнем старите listeners
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    // Добавяме нов listener
    newContainer.addEventListener('click', handleSpellContainerClick);
  }

  // Зареждаме детайли за отворената магия ако няма данни
  const expandedIndex = state.ui.expandedSpellIndex;
  if (expandedIndex && state.spells[expandedIndex] && !state.spells[expandedIndex].data) {
    ensureSpellDetails(expandedIndex);
  }
}

function renderSpellDetailsContent(d) {
  const lines = [];

  lines.push(`<div class="spell-detail-name">${d.name} (Level ${d.level} ${d.school?.name || ''})</div>`);
  
  if (d.casting_time) lines.push(`<div class="spell-detail-line"><strong>Casting Time:</strong> ${d.casting_time}</div>`);
  if (d.range) lines.push(`<div class="spell-detail-line"><strong>Range:</strong> ${d.range}</div>`);
  if (d.duration) lines.push(`<div class="spell-detail-line"><strong>Duration:</strong> ${d.duration}</div>`);
  if (Array.isArray(d.components)) {
    lines.push(`<div class="spell-detail-line"><strong>Components:</strong> ${d.components.join(', ')}</div>`);
  }
  if (d.concentration) lines.push(`<div class="spell-detail-line"><strong>Concentration:</strong> Yes</div>`);
  if (d.ritual) lines.push(`<div class="spell-detail-line"><strong>Ritual:</strong> Yes</div>`);

  if (Array.isArray(d.desc)) {
    lines.push(`<div class="spell-detail-desc">${d.desc.join('<br><br>')}</div>`);
  }
  if (Array.isArray(d.higher_level) && d.higher_level.length > 0) {
    lines.push(`<div class="spell-detail-higher"><strong>At Higher Levels:</strong><br>${d.higher_level.join('<br><br>')}</div>`);
  }

  return lines.join('');
}

function handleSpellContainerClick(e) {
  const item = e.target.closest('.spell-item');
  if (!item) return;
  const index = item.dataset.index;

  // Кликване на header (но не на бутоните)
  const header = e.target.closest('.spell-header');
  if (header && !e.target.classList.contains('btn-known') && !e.target.classList.contains('btn-prepared') && !e.target.closest('button')) {
    e.stopPropagation();
    handleToggleSpell(index);
    return;
  }

  if (e.target.classList.contains('btn-known')) {
    e.stopPropagation();
    toggleSpellKnown(index);
    renderSpells();
  } else if (e.target.classList.contains('btn-prepared')) {
    e.stopPropagation();
    toggleSpellPrepared(index);
    renderSpells();
  }
}

function handleToggleSpell(index) {
  const wasExpanded = state.ui.expandedSpellIndex === index;
  setExpandedSpell(index);
  renderSpells();
  // Зареждаме детайли ако няма и магията е отворена
  if (state.ui.expandedSpellIndex === index && !wasExpanded) {
    ensureSpellDetails(index);
  }
}

async function loadSpellsForCurrentFilter(clearExisting = false) {
  const errorEl = document.getElementById('spells-error');
  errorEl.textContent = '';
  const { className } = state.caster;
  const level = state.ui.filterLevel;

  // Ако трябва да изчистим съществуващите магии, изчистваме само тези от други нива
  if (clearExisting) {
    // Изчистваме магиите от други нива, но запазваме тези за текущото ниво
    Object.keys(state.spells).forEach(index => {
      const spell = state.spells[index];
      if (spell.loadedForLevel !== undefined && spell.loadedForLevel !== level) {
        delete state.spells[index];
      } else if (spell.data && typeof spell.data.level === 'number' && spell.data.level !== level) {
        delete state.spells[index];
      }
    });
    saveState();
  }

  try {
    const refs = await fetchClassSpellsAtLevel(className, level);
    // Затваряме отворената магия при зареждане на нови магии
    state.ui.expandedSpellIndex = null;
    
    refs.forEach(r => {
      upsertSpellRef(r.index, r);
    });
    
    // Рендерираме акордеона с новите магии
    renderSpells();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Грешка при зареждане на магии.';
  }
}

async function ensureSpellDetails(index) {
  const entry = state.spells[index];
  if (!entry) return;
  
  // Ако вече има данни, просто обновяваме рендера
  if (entry.data) {
    if (state.ui.expandedSpellIndex === index) {
      renderSpells();
    }
    return;
  }

  try {
    const d = await fetchSpellDetails(index);
    upsertSpellData(index, d);
    // Винаги обновяваме рендера след зареждане на данни, за да се покажат детайлите
    // Магията трябва да остане видима и отворена
    renderSpells();
  } catch (err) {
    console.error(err);
    // Обновяваме рендера дори при грешка, за да покажем съобщение за грешка
    if (state.ui.expandedSpellIndex === index) {
      renderSpells();
    }
  }
}

