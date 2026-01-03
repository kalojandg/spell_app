const API_BASE = 'https://www.dnd5eapi.co';

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

async function fetchProficiencyBonus(className, level) {
  const url = `${API_BASE}/api/classes/${className}/levels/${level}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  return data.prof_bonus || 2; // fallback на 2 ако няма данни
}

