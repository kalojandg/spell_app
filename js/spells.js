function renderSpells() {
  const root = document.getElementById('spells-root');
  const list = Object.entries(state.spells).map(([index, s]) => ({
    index,
    ...s,
  }));

  const level = state.ui.filterLevel;
  
  // Ако няма избрано ниво, показваме съобщение
  if (level === null || level === undefined) {
    root.innerHTML = '<div class="small">Изберете ниво за да заредите магии.</div>';
    return;
  }
  
  const filtered = list.filter(s => {
    // Ако магията е отворена в акордеона, винаги я показваме
    if (state.ui.expandedSpellIndex === s.index) {
      return true;
    }
    
    // Първо проверяваме дали е заредена за текущото ниво
    // Това гарантира че магиите остават видими дори ако са upcast-нати
    // (API-то връща магии които могат да се кастват на това ниво, не само магии на точното ниво)
    if (s.loadedForLevel !== undefined) {
      return s.loadedForLevel === level;
    }
    
    // Ако няма loadedForLevel, но имаме данни, проверяваме реалното ниво
    // Това е fallback за магии които са заредени но нямат loadedForLevel
    if (s.data && typeof s.data.level === 'number') {
      return s.data.level === level;
    }
    
    // Ако няма нито loadedForLevel, нито данни, не показваме магията
    return false;
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
          // Показваме нивото за което е заредена магията (може да е upcast)
          const lvl = level;
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
  // Извикваме само ако магията е отворена и няма данни, за да избегнем примигване
  const expandedIndex = state.ui.expandedSpellIndex;
  if (expandedIndex && state.spells[expandedIndex] && !state.spells[expandedIndex].data) {
    // Извикваме асинхронно за да не блокираме рендеринга
    ensureSpellDetails(expandedIndex).catch(console.error);
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
  setExpandedSpell(index);
  // Рендерираме веднъж - ensureSpellDetails ще се извика от renderSpells ако е необходимо
  renderSpells();
}

async function loadSpellsForCurrentFilter() {
  const errorEl = document.getElementById('spells-error');
  errorEl.textContent = '';
  const { className } = state.caster;
  const level = state.ui.filterLevel;

  // Ако няма избрано ниво, не зареждаме магии
  if (level === null || level === undefined) {
    renderSpells();
    return;
  }

  // Изчистваме ВСИЧКИ магии преди да заредим нови
  state.spells = {};
  state.ui.expandedSpellIndex = null;
  saveState();

  try {
    const refs = await fetchClassSpellsAtLevel(className, level);
    
    // Зареждаме новите магии от API
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
  
  // Ако вече има данни, не правим нищо - данните вече са показани
  if (entry.data) {
    return;
  }

  try {
    const d = await fetchSpellDetails(index);
    upsertSpellData(index, d);
    // Обновяваме рендера само ако магията все още е отворена
    // Това предотвратява примигване ако потребителят е затворил магията докато се зареждат данните
    if (state.ui.expandedSpellIndex === index) {
      renderSpells();
    }
  } catch (err) {
    console.error(err);
    // Обновяваме рендера дори при грешка, само ако магията е отворена
    if (state.ui.expandedSpellIndex === index) {
      renderSpells();
    }
  }
}

