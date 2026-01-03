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

