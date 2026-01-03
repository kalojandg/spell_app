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

