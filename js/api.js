const API_BASE = 'https://www.dnd5eapi.co';

// Кеш за класовите магии (index set)
const classSpellsCache = {};

async function fetchClassSpellsAtLevel(className, spellLevel) {
  // Ако нямаме кеширани магии за този клас, зареждаме всички
  if (!classSpellsCache[className]) {
    const url = `${API_BASE}/api/classes/${className}/spells`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    const data = await res.json();
    // Запазваме като Set от индекси за бързо търсене
    classSpellsCache[className] = new Set((data.results || []).map(s => s.index));
  }
  
  // Зареждаме всички магии от този spell level
  const levelUrl = `${API_BASE}/api/spells?level=${spellLevel}`;
  const levelRes = await fetch(levelUrl);
  if (!levelRes.ok) {
    throw new Error(`API error: ${levelRes.status}`);
  }
  const levelData = await levelRes.json();
  const allLevelSpells = levelData.results || [];
  
  // Филтрираме само магиите, които са налични за класа
  const classSpellSet = classSpellsCache[className];
  return allLevelSpells.filter(spell => classSpellSet.has(spell.index));
}

async function fetchSpellDetails(index) {
  const res = await fetch(`${API_BASE}/api/spells/${index}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

async function fetchProficiencyBonus(className, level) {
  const url = `${API_BASE}/api/classes/${className}/levels/${level}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  return data.prof_bonus || 2; // fallback на 2 ако няма данни
}

async function fetchSpellSlots(className, level) {
  const url = `${API_BASE}/api/classes/${className}/levels/${level}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  const spellcasting = data.spellcasting || {};
  
  // Извличаме spell slots от spellcasting обекта
  const slots = {};
  for (let i = 1; i <= 9; i++) {
    const slotCount = spellcasting[`spell_slots_level_${i}`] || 0;
    if (slotCount > 0) {
      // Запазваме текущото използвано количество, ако вече съществува
      const existing = state.slots[i];
      // Или използваме savedUsed ако има (след page refresh)
      const savedUsed = state._savedUsed ? (state._savedUsed[i] || 0) : 0;
      slots[i] = {
        max: slotCount,
        used: existing ? existing.used : savedUsed,
      };
    }
  }
  
  // Изчистваме savedUsed след като е използвано
  if (state._savedUsed) {
    delete state._savedUsed;
  }
  
  return slots;
}

