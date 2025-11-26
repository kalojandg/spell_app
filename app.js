const STORAGE_KEY = 'spellbook-state-v2';

const defaultState = {
  caster: {
    className: 'druid',
    level: 4,
    abilityMod: 3,
    profBonus: 2,
  },
  slots: {
    1: { max: 4, used: 0 },
    2: { max: 3, used: 0 },
    3: { max: 3, used: 0 },
    4: { max: 1, used: 0 },
  },
  spells: {
    // [index]: { ref, data, known, prepared }
  },
  ui: {
    selectedSpellIndex: null,
    filterLevel: 4,
  },
};

let state = loadState();

/* ---------- Persistence ---------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return mergeDeep(structuredClone(defaultState), parsed);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// simple deep merge for plain objects
function mergeDeep(base, extra) {
  for (const key of Object.keys(extra)) {
    if (
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      base[key] = mergeDeep(base[key], extra[key]);
    } else {
      base[key] = extra[key];
    }
  }
  return base;
}

/* ---------- Derived ---------- */

function getSpellAttackBonus() {
  return state.caster.abilityMod + state.caster.profBonus;
}
function getSpellSaveDC() {
  return 8 + state.caster.abilityMod + state.caster.profBonus;
}

/* ---------- Mutations ---------- */

function updateCaster(partial) {
  state.caster = { ...state.caster, ...partial };
  saveState();
}

function setSlot(level, payload) {
  state.slots[level] = { ...state.slots[level], ...payload };
  saveState();
}

function useSlot(level) {
  const s = state.slots[level];
  if (!s) return;
  if (s.used < s.max) {
    s.used++;
    saveState();
  }
}

function recoverSlot(level) {
  const s = state.slots[level];
  if (!s) return;
  if (s.used > 0) {
    s.used--;
    saveState();
  }
}

function upsertSpellRef(index, ref) {
  if (!state.spells[index]) {
    state.spells[index] = {
      ref,
      data: null,
      known: false,
      prepared: false,
    };
  } else {
    state.spells[index].ref = ref;
  }
  saveState();
}

function upsertSpellData(index, data) {
  if (!state.spells[index]) {
    state.spells[index] = {
      ref: { index, name: data.name, url: `/api/spells/${index}` },
      data,
      known: false,
      prepared: false,
    };
  } else {
    state.spells[index].data = data;
  }
  saveState();
}

function toggleSpellKnown(index) {
  const s = state.spells[index];
  if (!s) return;
  s.known = !s.known;
  if (!s.known) s.prepared = false;
  saveState();
}

function toggleSpellPrepared(index) {
  const s = state.spells[index];
  if (!s || !s.known) return;
  s.prepared = !s.prepared;
  saveState();
}

function selectSpell(index) {
  state.ui.selectedSpellIndex = index;
  saveState();
}

function setFilterLevel(level) {
  state.ui.filterLevel = level;
  saveState();
}

/* ---------- Rendering ---------- */

function renderCaster() {
  const root = document.getElementById('caster-root');
  const { className, level, abilityMod, profBonus } = state.caster;

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
        <input id="caster-prof-bonus" type="number" value="${profBonus}">
      </label>
    </div>
    <div class="derived">
      Spell Attack Bonus: <strong>+${getSpellAttackBonus()}</strong><br>
      Spell Save DC: <strong>${getSpellSaveDC()}</strong>
    </div>
  `;

  root.querySelector('#caster-class').addEventListener('change', e => {
    updateCaster({ className: e.target.value });
  });
  root.querySelector('#caster-level').addEventListener('change', e => {
    const val = Number(e.target.value) || 1;
    updateCaster({ level: val });
  });
  root.querySelector('#caster-ability-mod').addEventListener('change', e => {
    const val = Number(e.target.value) || 0;
    updateCaster({ abilityMod: val });
    renderCaster();
  });
  root.querySelector('#caster-prof-bonus').addEventListener('change', e => {
    const val = Number(e.target.value) || 2;
    updateCaster({ profBonus: val });
    renderCaster();
  });
}

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

function renderDetails() {
  const root = document.getElementById('details-root');
  const index = state.ui.selectedSpellIndex;
  if (!index || !state.spells[index]) {
    root.textContent = 'Няма избрана магия.';
    return;
  }
  const entry = state.spells[index];

  if (!entry.data) {
    root.textContent = 'Зареждане на детайли...';
    return;
  }

  const d = entry.data;
  const lines = [];

  lines.push(`${d.name} (Level ${d.level} ${d.school?.name || ''})`);
  lines.push('');
  if (d.casting_time) lines.push(`Casting Time: ${d.casting_time}`);
  if (d.range) lines.push(`Range: ${d.range}`);
  if (d.duration) lines.push(`Duration: ${d.duration}`);
  if (Array.isArray(d.components)) {
    lines.push(`Components: ${d.components.join(', ')}`);
  }
  if (d.concentration) lines.push('Concentration: Yes');
  if (d.ritual) lines.push('Ritual: Yes');
  lines.push('');

  if (Array.isArray(d.desc)) {
    lines.push(d.desc.join('\n\n'));
  }
  if (Array.isArray(d.higher_level) && d.higher_level.length > 0) {
    lines.push('');
    lines.push('At Higher Levels:');
    lines.push(d.higher_level.join('\n\n'));
  }

  root.textContent = lines.join('\n');
}

/* ---------- API ---------- */

const API_BASE = 'https://www.dnd5eapi.co';

// нов endpoint: /api/classes/{index}/levels/{spell_level}/spells
async function fetchClassSpellsAtLevel(className, level) {
  const url = `${API_BASE}/api/classes/${className}/levels/${level}/spells`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  return data.results || [];
}

async function fetchSpellDetails(index) {
  const res = await fetch(`${API_BASE}/api/spells/${index}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
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

/* ---------- Handlers ---------- */

function handleSelectSpell(index) {
  selectSpell(index);
  renderDetails();
  ensureSpellDetails(index);
}

/* ---------- Global init ---------- */

function renderAll() {
  renderCaster();
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
