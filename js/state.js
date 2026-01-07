const STORAGE_KEY = 'spellbook-state-v2';

// Known spells по ниво за класовете с фиксиран брой known spells
// Индексът е character level, стойността е брой known spells
const KNOWN_SPELLS_TABLE = {
  sorcerer: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  bard:     [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  ranger:   [0, 0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  warlock:  [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
};

// Mapping за типа на spellcasting по клас
const CLASS_SPELLCASTING = {
  cleric:   { type: 'prepared', formula: 'level + mod', casterType: 'full' },
  druid:    { type: 'prepared', formula: 'level + mod', casterType: 'full' },
  paladin:  { type: 'prepared', formula: 'half-level + mod', casterType: 'half' },
  wizard:   { type: 'spellbook', formula: 'level + mod', casterType: 'full' },
  sorcerer: { type: 'known', casterType: 'full' },
  bard:     { type: 'known', casterType: 'full' },
  ranger:   { type: 'known', casterType: 'half' },
  warlock:  { type: 'known', casterType: 'pact' },
};

// Максимално ниво на магии спрямо character level
// Full casters: 1->1, 3->2, 5->3, 7->4, 9->5, 11->6, 13->7, 15->8, 17->9
// Half casters: 2->1, 5->2, 9->3, 13->4, 17->5
// Warlock (pact): 1->1, 3->2, 5->3, 7->4, 9->5 (max 5th level spells)
function getMaxSpellLevel() {
  const { className, level } = state.caster;
  const classInfo = CLASS_SPELLCASTING[className];
  if (!classInfo) return 1;

  if (classInfo.casterType === 'full') {
    // Full caster progression
    if (level >= 17) return 9;
    if (level >= 15) return 8;
    if (level >= 13) return 7;
    if (level >= 11) return 6;
    if (level >= 9) return 5;
    if (level >= 7) return 4;
    if (level >= 5) return 3;
    if (level >= 3) return 2;
    return 1;
  } else if (classInfo.casterType === 'half') {
    // Half caster progression (Paladin, Ranger)
    if (level >= 17) return 5;
    if (level >= 13) return 4;
    if (level >= 9) return 3;
    if (level >= 5) return 2;
    if (level >= 2) return 1;
    return 0; // Paladin/Ranger don't get spells at level 1
  } else if (classInfo.casterType === 'pact') {
    // Warlock pact magic progression
    if (level >= 9) return 5;
    if (level >= 7) return 4;
    if (level >= 5) return 3;
    if (level >= 3) return 2;
    return 1;
  }
  return 1;
}

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
    filterLevel: null, // null означава "не е избрано ниво"
    expandedSpellIndex: null, // Индекс на отворената магия в акордеона
    searchQuery: '', // Търсене по име на магия
  },
};

let state = loadState();

/* ---------- Persistence ---------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    const merged = mergeDeep(structuredClone(defaultState), parsed);
    // Запазваме known/prepared статусите, но изчистваме временните данни
    // Изчистваме loadedForLevel и data, но запазваме known/prepared
    for (const index of Object.keys(merged.spells)) {
      merged.spells[index].loadedForLevel = null;
      merged.spells[index].data = null;
    }
    merged.ui.expandedSpellIndex = null;
    merged.ui.filterLevel = null;
    merged.ui.searchQuery = '';
    return merged;
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

function getMaxPreparedSpells() {
  const { className, level, abilityMod } = state.caster;
  const classInfo = CLASS_SPELLCASTING[className];
  
  if (!classInfo || classInfo.type === 'known') {
    // Known casters нямат prepared spells limit по този начин
    return null;
  }
  
  let max;
  if (classInfo.formula === 'level + mod') {
    max = level + abilityMod;
  } else if (classInfo.formula === 'half-level + mod') {
    // Paladin: floor(level/2) + mod
    max = Math.floor(level / 2) + abilityMod;
  } else {
    max = level + abilityMod;
  }
  
  // Minimum е 1
  return Math.max(1, max);
}

function getPreparedCount() {
  return Object.values(state.spells).filter(s => s.prepared).length;
}

function getKnownCount() {
  return Object.values(state.spells).filter(s => s.known).length;
}

function getMaxKnownSpells() {
  const { className, level } = state.caster;
  const table = KNOWN_SPELLS_TABLE[className];
  
  if (!table) {
    // Prepared casters нямат known spells limit
    return null;
  }
  
  // Clamp level между 1 и 20
  const clampedLevel = Math.max(1, Math.min(20, level));
  return table[clampedLevel] || 0;
}

function getSpellcastingType() {
  const classInfo = CLASS_SPELLCASTING[state.caster.className];
  return classInfo ? classInfo.type : 'prepared';
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
  // Валидация: не може да използваме повече от максималните
  if (s.used < s.max) {
    s.used++;
    saveState();
  }
}

function recoverSlot(level) {
  const s = state.slots[level];
  if (!s) return;
  // Валидация: не може да бъде по-малко от 0
  if (s.used > 0) {
    s.used--;
    saveState();
  }
}

function upsertSpellRef(index, ref, level) {
  // Ако level не е подаден, използваме state.ui.filterLevel
  const filterLevel = level !== undefined ? level : state.ui.filterLevel;
  
  if (!state.spells[index]) {
    state.spells[index] = {
      ref,
      data: null,
      known: false,
      prepared: false,
      loadedForLevel: filterLevel, // Запазваме за кое ниво е заредена магията
    };
  } else {
    state.spells[index].ref = ref;
    // Винаги обновяваме loadedForLevel когато зареждаме магии за ново ниво
    // Това гарантира че магиите се показват правилно за текущото ниво
    state.spells[index].loadedForLevel = filterLevel;
  }
  // Не извикваме saveState() тук - ще го извикаме след като всички магии са добавени
}

function upsertSpellData(index, data) {
  if (!state.spells[index]) {
    state.spells[index] = {
      ref: { index, name: data.name, url: `/api/spells/${index}` },
      data,
      known: false,
      prepared: false,
      loadedForLevel: state.ui.filterLevel, // Запазваме за кое ниво е заредена магията
    };
  } else {
    // Запазваме ref ако вече съществува
    state.spells[index].data = data;
    // Ако няма ref, създаваме го
    if (!state.spells[index].ref) {
      state.spells[index].ref = { index, name: data.name, url: `/api/spells/${index}` };
    }
    // Винаги запазваме loadedForLevel - не го променяме ако вече е зададен
    // Това гарантира че магиите остават видими дори след зареждане на детайлите
    if (state.spells[index].loadedForLevel === undefined) {
      state.spells[index].loadedForLevel = state.ui.filterLevel;
    }
  }
  saveState();
}

function toggleSpellKnown(index) {
  const s = state.spells[index];
  if (!s) return;
  
  // Ако искаме да добавим към known (не е known в момента)
  if (!s.known) {
    const max = getMaxKnownSpells();
    const current = getKnownCount();
    // Проверяваме дали сме достигнали максимума (само за known casters)
    if (max !== null && current >= max) {
      // Не може да научим повече магии
      return;
    }
  }
  
  s.known = !s.known;
  if (!s.known) s.prepared = false;
  saveState();
}

function toggleSpellPrepared(index) {
  const s = state.spells[index];
  if (!s || !s.known) return;
  
  // Ако искаме да подготвим (не е prepared в момента)
  if (!s.prepared) {
    const max = getMaxPreparedSpells();
    const current = getPreparedCount();
    // Проверяваме дали сме достигнали максимума
    if (max !== null && current >= max) {
      // Не може да подготвим повече магии
      return;
    }
  }
  
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

function setExpandedSpell(index) {
  // Ако кликнем на същата магия, затваряме я
  if (state.ui.expandedSpellIndex === index) {
    state.ui.expandedSpellIndex = null;
  } else {
    state.ui.expandedSpellIndex = index;
  }
  saveState();
}

function setSearchQuery(query) {
  state.ui.searchQuery = query || '';
  // Не запазваме в localStorage - търсенето е временно
}

function clearAllSpells() {
  state.spells = {};
  state.ui.expandedSpellIndex = null;
  state.ui.filterLevel = null;
  state.ui.searchQuery = '';
  saveState();
}

// Обновява dropdown опциите за spell level спрямо наличните spell slots
function updateSpellLevelDropdown() {
  const filterEl = document.getElementById('filter-level');
  if (!filterEl) return;
  
  const currentValue = filterEl.value;
  
  // Взимаме реалните налични слотове от state.slots
  const availableLevels = Object.keys(state.slots)
    .map(n => Number(n))
    .filter(n => state.slots[n] && state.slots[n].max > 0)
    .sort((a, b) => a - b);
  
  const labels = ['', '1-во', '2-ро', '3-то', '4-то', '5-то', '6-то', '7-мо', '8-мо', '9-то'];
  
  filterEl.innerHTML = '<option value="">Изберете</option>';
  
  for (const level of availableLevels) {
    const option = document.createElement('option');
    option.value = String(level);
    option.textContent = labels[level];
    filterEl.appendChild(option);
  }
  
  // Ако текущо избраното ниво вече не е налично, нулираме
  if (currentValue && !availableLevels.includes(Number(currentValue))) {
    filterEl.value = '';
    setFilterLevel(null);
    state.ui.expandedSpellIndex = null;
    saveState();
    if (typeof renderSpells === 'function') {
      renderSpells();
    }
  } else if (currentValue) {
    filterEl.value = currentValue;
  }
}

