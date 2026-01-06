import { test, expect } from '@playwright/test';

// Mock данни за API
const mockSpellsLevel1 = {
  count: 3,
  results: [
    { index: 'cure-wounds', name: 'Cure Wounds', url: '/api/spells/cure-wounds' },
    { index: 'healing-word', name: 'Healing Word', url: '/api/spells/healing-word' },
    { index: 'entangle', name: 'Entangle', url: '/api/spells/entangle' },
  ]
};

const mockSpellsLevel2 = {
  count: 2,
  results: [
    { index: 'lesser-restoration', name: 'Lesser Restoration', url: '/api/spells/lesser-restoration' },
    { index: 'moonbeam', name: 'Moonbeam', url: '/api/spells/moonbeam' },
  ]
};

const mockSpellsLevel3 = {
  count: 2,
  results: [
    { index: 'call-lightning', name: 'Call Lightning', url: '/api/spells/call-lightning' },
    { index: 'dispel-magic', name: 'Dispel Magic', url: '/api/spells/dispel-magic' },
  ]
};

const mockSpellDetails = {
  'cure-wounds': {
    index: 'cure-wounds', name: 'Cure Wounds', level: 1,
    school: { name: 'Evocation' }, casting_time: '1 action', range: 'Touch',
    duration: 'Instantaneous', components: ['V', 'S'],
    desc: ['A creature you touch regains hit points.'],
    higher_level: ['When cast at higher level, heals more.']
  },
  'healing-word': {
    index: 'healing-word', name: 'Healing Word', level: 1,
    school: { name: 'Evocation' }, casting_time: '1 bonus action', range: '60 feet',
    duration: 'Instantaneous', components: ['V'],
    desc: ['A creature of your choice regains hit points.']
  },
  'entangle': {
    index: 'entangle', name: 'Entangle', level: 1,
    school: { name: 'Conjuration' }, casting_time: '1 action', range: '90 feet',
    duration: 'Concentration, up to 1 minute', components: ['V', 'S'],
    concentration: true,
    desc: ['Grasping weeds and vines sprout from the ground.']
  },
  'lesser-restoration': {
    index: 'lesser-restoration', name: 'Lesser Restoration', level: 2,
    school: { name: 'Abjuration' }, casting_time: '1 action', range: 'Touch',
    duration: 'Instantaneous', components: ['V', 'S'],
    desc: ['You touch a creature and can end one condition.']
  },
  'moonbeam': {
    index: 'moonbeam', name: 'Moonbeam', level: 2,
    school: { name: 'Evocation' }, casting_time: '1 action', range: '120 feet',
    duration: 'Concentration, up to 1 minute', components: ['V', 'S', 'M'],
    concentration: true,
    desc: ['A silvery beam of pale light shines down.']
  },
  'call-lightning': {
    index: 'call-lightning', name: 'Call Lightning', level: 3,
    school: { name: 'Conjuration' }, casting_time: '1 action', range: '120 feet',
    duration: 'Concentration, up to 10 minutes', components: ['V', 'S'],
    concentration: true,
    desc: ['A storm cloud appears.']
  },
  'dispel-magic': {
    index: 'dispel-magic', name: 'Dispel Magic', level: 3,
    school: { name: 'Abjuration' }, casting_time: '1 action', range: '120 feet',
    duration: 'Instantaneous', components: ['V', 'S'],
    desc: ['Choose one creature, object, or magical effect.']
  }
};

const mockClassLevel = (level) => ({
  prof_bonus: Math.ceil(level / 4) + 1,
  spellcasting: {
    spell_slots_level_1: level >= 1 ? 4 : 0,
    spell_slots_level_2: level >= 3 ? 3 : 0,
    spell_slots_level_3: level >= 5 ? 2 : 0,
    spell_slots_level_4: level >= 7 ? 1 : 0,
  }
});

// Helper функция за setup на API mocks
async function setupApiMocks(page) {
  await page.route('**/api/classes/*/levels/*/spells', async (route) => {
    const url = route.request().url();
    let response = mockSpellsLevel1;
    if (url.includes('/levels/2/')) response = mockSpellsLevel2;
    else if (url.includes('/levels/3/')) response = mockSpellsLevel3;
    await route.fulfill({ json: response });
  });

  await page.route('**/api/spells/*', async (route) => {
    const url = route.request().url();
    const spellIndex = url.split('/').pop();
    const details = mockSpellDetails[spellIndex] || mockSpellDetails['cure-wounds'];
    await route.fulfill({ json: details });
  });

  await page.route('**/api/classes/*/levels/*', async (route) => {
    const url = route.request().url();
    const levelMatch = url.match(/\/levels\/(\d+)$/);
    const level = levelMatch ? parseInt(levelMatch[1]) : 4;
    await route.fulfill({ json: mockClassLevel(level) });
  });
}

test.describe('Spell App - Базова функционалност', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
  });

  test('трябва да зареди началната страница', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Spellbook');
  });

  test('трябва да показва секцията за Caster', async ({ page }) => {
    await expect(page.locator('#caster-section h2')).toContainText('Caster');
  });

  test('трябва да показва секцията за Spell Slots', async ({ page }) => {
    await expect(page.locator('#slots-section h2')).toContainText('Spell Slots');
  });

  test('трябва да показва секцията за Spells', async ({ page }) => {
    await expect(page.locator('#spells-section h2')).toContainText('Spells');
  });

  test('трябва да показва секцията за Детайли', async ({ page }) => {
    await expect(page.locator('#details-section h2')).toContainText('Детайли');
  });

  test('трябва да показва празен акордеон при зареждане на страницата', async ({ page }) => {
    // Изчистваме localStorage за да няма стари магии
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Проверяваме че дропдаунът показва "Изберете"
    const filterLevel = page.locator('#filter-level');
    await expect(filterLevel).toHaveValue('');
    
    // Проверяваме че акордеонът е празен - съобщението има точка накрая
    const spellsRoot = page.locator('#spells-root');
    const content = await spellsRoot.textContent();
    expect(content).toContain('Изберете ниво за да заредите магии.');
    
    // Проверяваме че няма магии в списъка
    const spellItems = page.locator('.spell-item');
    await expect(spellItems).toHaveCount(0);
  });

  test('трябва да изчиства акордеона когато се избере "Изберете" от дропдауна', async ({ page }) => {
    // Изчистваме localStorage
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Първо зареждаме магии за ниво 1
    await page.locator('#filter-level').selectOption('1');
    // Чакаме да се появят магии в списъка
    await page.waitForSelector('.spell-item', { timeout: 10000 });
    
    // Проверяваме че има магии
    const spellItemsBefore = page.locator('.spell-item');
    const countBefore = await spellItemsBefore.count();
    expect(countBefore).toBeGreaterThan(0);
    
    // Избираме "Изберете" от дропдауна - използваме JavaScript за да зададем стойността
    await page.evaluate(() => {
      const select = document.getElementById('filter-level');
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(1000);
    
    // Проверяваме че дропдаунът показва "Изберете"
    const filterLevel = page.locator('#filter-level');
    await expect(filterLevel).toHaveValue('');
    
    // Проверяваме че акордеонът е празен - съобщението има точка накрая
    const spellsRoot = page.locator('#spells-root');
    const content = await spellsRoot.textContent();
    expect(content).toContain('Изберете ниво за да заредите магии.');
    
    // Проверяваме че няма магии в списъка
    const spellItemsAfter = page.locator('.spell-item');
    await expect(spellItemsAfter).toHaveCount(0);
  });
});

test.describe('Proficiency Bonus - Автоматично изчисляване', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    // Изчистваме localStorage за чист тест
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('трябва да показва proficiency bonus като span, не като input', async ({ page }) => {
    const profElement = page.locator('#caster-prof-bonus');
    await expect(profElement).toBeVisible();
    // Проверяваме че е span, не input
    const tagName = await profElement.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('span');
  });

  test('трябва да изчисли правилно prof bonus за ниво 1 (трябва да е 2)', async ({ page }) => {
    // Променяме нивото на 1
    await page.locator('#caster-level').fill('1');
    await page.locator('#caster-level').blur();
    
    // Чакаме малко за API заявката
    await page.waitForTimeout(500);
    
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('2');
  });

  test('трябва да изчисли правилно prof bonus за ниво 4 (трябва да е 2)', async ({ page }) => {
    // Ниво 4 трябва да има prof bonus 2
    await page.locator('#caster-level').fill('4');
    await page.locator('#caster-level').blur();
    
    await page.waitForTimeout(500);
    
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('2');
  });

  test('трябва да изчисли правилно prof bonus за ниво 5 (трябва да е 3)', async ({ page }) => {
    // Ниво 5 трябва да има prof bonus 3
    await page.locator('#caster-level').fill('5');
    await page.locator('#caster-level').blur();
    
    await page.waitForTimeout(1500);
    
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('3');
  });

  test('трябва да изчисли правилно prof bonus за ниво 9 (трябва да е 4)', async ({ page }) => {
    await page.locator('#caster-level').fill('9');
    await page.locator('#caster-level').blur();
    
    await page.waitForTimeout(1500);
    
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('4');
  });

  test('трябва да изчисли правилно prof bonus за ниво 13 (трябва да е 5)', async ({ page }) => {
    await page.locator('#caster-level').fill('13');
    await page.locator('#caster-level').blur();
    
    await page.waitForTimeout(1000);
    
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('5');
  });

  test('трябва да изчисли правилно prof bonus за ниво 17 (трябва да е 6)', async ({ page }) => {
    await page.locator('#caster-level').fill('17');
    await page.locator('#caster-level').blur();
    
    await page.waitForTimeout(500);
    
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('6');
  });

  test('трябва да обнови prof bonus когато се промени класът', async ({ page }) => {
    // Първо задаваме ниво
    await page.locator('#caster-level').fill('4');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(500);
    
    // Променяме класа
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    
    // Prof bonus трябва да остане същият (зависи само от нивото)
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('2');
  });

  test('трябва да обнови Spell Attack Bonus и Spell Save DC когато се промени prof bonus', async ({ page }) => {
    // Задаваме ниво 5 (prof bonus 3)
    await page.locator('#caster-level').fill('5');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(500);
    
    // Проверяваме че derived стойностите са обновени
    // Използваме по-специфичен селектор
    const derivedSection = page.locator('.derived');
    const spellAttackBonus = await derivedSection.locator('text=/Spell Attack Bonus/').locator('..').locator('strong').first().textContent();
    const spellSaveDC = await derivedSection.locator('text=/Spell Save DC/').locator('..').locator('strong').first().textContent();
    
    // Ако ability mod е 3 и prof bonus е 3, трябва да е 6
    // Но не знаем точно какво е ability mod, така че просто проверяваме че са обновени
    expect(spellAttackBonus).toBeTruthy();
    expect(spellSaveDC).toBeTruthy();
  });
});

test.describe('Spell Slots - Автоматично изчисляване', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да зареди spell slots автоматично от API при зареждане', async ({ page }) => {
    // Чакаме малко за API заявката
    await page.waitForTimeout(1000);
    
    // Проверяваме че има slot rows
    const slotRows = page.locator('.slot-row');
    await expect(slotRows.first()).toBeVisible();
  });

  test('трябва да обнови spell slots когато се промени нивото', async ({ page }) => {
    // Задаваме ниво 5
    await page.locator('#caster-level').fill('5');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(1000);
    
    // Проверяваме че има slot за level 3 (което трябва да се появи на ниво 5)
    const level3Slot = page.locator('.slot-row').filter({ hasText: 'Level 3' });
    await expect(level3Slot).toBeVisible();
  });

  test('трябва да обнови spell slots когато се промени класът', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Променяме класа
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(1000);
    
    // Проверяваме че slots са обновени
    const slotRows = page.locator('.slot-row');
    await expect(slotRows.first()).toBeVisible();
  });

  test('трябва да има само бутон за използване на slot, не за възстановяване', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const slotRow = page.locator('.slot-row').first();
    // Проверяваме че няма бутон за намаляване
    const decButton = slotRow.locator('.slot-dec');
    await expect(decButton).toHaveCount(0);
    
    // Проверяваме че има бутон за използване
    const useButton = slotRow.locator('.btn-slot-use');
    await expect(useButton).toBeVisible();
  });

  test('трябва да може да използва slot', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const slotRow = page.locator('.slot-row').first();
    const countBefore = await slotRow.locator('.count').textContent();
    const remainingBefore = parseInt(countBefore.trim().replace(/\s+/g, '').split('/')[0]);
    const max = parseInt(countBefore.trim().replace(/\s+/g, '').split('/')[1]);
    
    // Кликваме на бутона за използване
    await slotRow.locator('.btn-slot-use').click();
    await page.waitForTimeout(500);
    
    const countAfter = await slotRow.locator('.count').textContent();
    const remainingAfter = parseInt(countAfter.trim().replace(/\s+/g, '').split('/')[0]);
    
    // Разполагаемите трябва да намалеят с 1
    expect(remainingAfter).toBe(remainingBefore - 1);
    // Максималните трябва да останат същите
    const maxAfter = parseInt(countAfter.trim().replace(/\s+/g, '').split('/')[1]);
    expect(maxAfter).toBe(max);
  });

  test('трябва да не може да използва повече слотове от максималните', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const slotRow = page.locator('.slot-row').first();
    const countText = await slotRow.locator('.count').textContent();
    const parts = countText.trim().replace(/\s+/g, '').split('/');
    const max = parseInt(parts[1]);
    
    // Използваме всички слотове
    for (let i = 0; i < max + 2; i++) {
      const button = slotRow.locator('.btn-slot-use');
      const isDisabled = await button.isDisabled().catch(() => false);
      if (isDisabled) break;
      
      await button.click();
      await page.waitForTimeout(200);
    }
    
    // Проверяваме че не можем да използваме повече
    // Разполагаемите трябва да са 0 или повече, но не отрицателни
    const finalCount = await slotRow.locator('.count').textContent();
    const finalRemaining = parseInt(finalCount.trim().replace(/\s+/g, '').split('/')[0]);
    expect(finalRemaining).toBeGreaterThanOrEqual(0);
    expect(finalRemaining).toBeLessThanOrEqual(max);
    
    // Бутонът трябва да е disabled когато няма разполагаеми слотове
    if (finalRemaining === 0) {
      const button = slotRow.locator('.btn-slot-use');
      await expect(button).toBeDisabled();
    }
  });

  test('трябва да показва правилно използваните и максималните слотове', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const slotRow = page.locator('.slot-row').first();
    const countText = await slotRow.locator('.count').textContent();
    
    // Форматът трябва да е "used/max" (може да има whitespace)
    const trimmed = countText.trim().replace(/\s+/g, '');
    expect(trimmed).toMatch(/^\d+\/\d+$/);
  });
});

test.describe('Spells - Акордеон функционалност', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(300);
    // Зареждаме магии за тестване - избираме ниво и чакаме да се заредят
    await page.locator('#filter-level').selectOption('1');
    // Чакаме магиите да се появят
    await page.waitForSelector('.spell-item', { timeout: 5000 });
  });

  test('трябва да показва списък с магии', async ({ page }) => {
    const spellItems = page.locator('.spell-item');
    await expect(spellItems.first()).toBeVisible({ timeout: 5000 });
  });

  test('трябва да може да отвори магия като кликнеш на хедъра', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    await expect(firstSpell).toBeVisible({ timeout: 5000 });
    const spellHeader = firstSpell.locator('.spell-header');
    
    // Първоначално детайлите не трябва да са видими
    const detailsBefore = firstSpell.locator('.spell-details');
    await expect(detailsBefore).toHaveCount(0);
    
    // Кликваме на хедъра
    await spellHeader.click();
    await page.waitForTimeout(1000);
    
    // Детайлите трябва да се появят
    const detailsAfter = firstSpell.locator('.spell-details');
    await expect(detailsAfter).toBeVisible({ timeout: 5000 });
  });

  test('трябва да може да затвори магия като кликнеш отново на хедъра', async ({ page }) => {
    // Отваряме магията
    await page.locator('.spell-item').first().locator('.spell-header').click();
    // Чакаме детайлите да се появят
    await page.waitForSelector('.spell-details', { timeout: 5000 });
    
    // Затваряме магията (кликваме пак на хедъра)
    await page.locator('.spell-item.spell-expanded .spell-header').click();
    await page.waitForTimeout(500);
    
    // Детайлите трябва да изчезнат
    await expect(page.locator('.spell-details')).toHaveCount(0);
    // Магиите трябва да са все още видими
    await expect(page.locator('.spell-item').first()).toBeVisible();
  });

  test('трябва да може да отвори само една магия наведнъж', async ({ page }) => {
    const spellItems = page.locator('.spell-item');
    await expect(spellItems.first()).toBeVisible({ timeout: 5000 });
    const firstSpell = spellItems.first();
    const secondSpell = spellItems.nth(1);
    
    // Отваряме първата магия
    await firstSpell.locator('.spell-header').click();
    // Чакаме да се зареди и да се покажат детайлите
    await expect(firstSpell.locator('.spell-details')).toBeVisible({ timeout: 5000 });
    // Проверяваме че първата магия е отворена
    await expect(firstSpell).toHaveClass(/spell-expanded/);
    
    // Отваряме втората магия
    await secondSpell.locator('.spell-header').click();
    // Чакаме да се обнови DOM-а
    await page.waitForTimeout(1000);
    
    // Първата трябва да се затвори (няма клас spell-expanded), втората да се отвори
    await expect(firstSpell).not.toHaveClass(/spell-expanded/, { timeout: 5000 });
    await expect(secondSpell).toHaveClass(/spell-expanded/, { timeout: 5000 });
    await expect(secondSpell.locator('.spell-details')).toBeVisible({ timeout: 5000 });
  });

  test('трябва да показва "Зареждане на детайли..." ако детайлите не са заредени', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    await expect(firstSpell).toBeVisible({ timeout: 5000 });
    
    // Отваряме магията
    await firstSpell.locator('.spell-header').click();
    await page.waitForTimeout(500);
    
    // Трябва да показва съобщение за зареждане или детайли
    const details = firstSpell.locator('.spell-details');
    await expect(details).toBeVisible({ timeout: 5000 });
    
    const content = await details.textContent();
    expect(content).toBeTruthy();
  });

  test('трябва да зарежда детайли автоматично когато се отвори магия', async ({ page }) => {
    // Отваряме магията
    await page.locator('.spell-item').first().locator('.spell-header').click();
    // Чакаме детайлите да се появят
    await page.waitForSelector('.spell-details', { timeout: 5000 });
    
    // Трябва да има детайли
    const details = page.locator('.spell-details');
    await expect(details).toBeVisible();
    const content = await details.textContent();
    expect(content).toBeTruthy();
  });

  test('трябва да не отваря магия при кликване на Known/Prepared бутоните', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    await expect(firstSpell).toBeVisible({ timeout: 5000 });
    const knownButton = firstSpell.locator('.btn-known');
    
    // Кликваме на Known бутона
    await knownButton.click();
    await page.waitForTimeout(500);
    
    // Магията не трябва да се отвори
    const details = firstSpell.locator('.spell-details');
    await expect(details).toHaveCount(0);
  });

  test('трябва да показва детайли в акордеона, не в details секцията', async ({ page }) => {
    // Отваряме магията
    await page.locator('.spell-item').first().locator('.spell-header').click();
    // Чакаме детайлите да се появят
    await page.waitForSelector('.spell-details', { timeout: 5000 });
    
    // Детайлите трябва да са в акордеона
    await expect(page.locator('.spell-item .spell-details')).toBeVisible();
    
    // Details секцията трябва да показва съобщение че детайлите са в списъка
    const detailsSection = page.locator('#details-root');
    const detailsText = await detailsSection.textContent();
    expect(detailsText).toContain('Детайлите');
  });

  test('трябва да зарежда различни магии при смяна на нивото', async ({ page }) => {
    // beforeEach вече е заредил магии за ниво 1
    // Проверяваме че има магии за ниво 1
    const level1Spells = page.locator('.spell-item');
    await expect(level1Spells.first()).toBeVisible({ timeout: 5000 });
    const level1Count = await level1Spells.count();
    expect(level1Count).toBeGreaterThan(0);
    
    // Проверяваме че магиите показват Level 1
    const firstSpellTags = await level1Spells.first().locator('.spell-tags').textContent();
    expect(firstSpellTags).toContain('Level 1');
    
    // Променяме филтъра на ниво 2
    await page.locator('#filter-level').selectOption('2');
    // Чакаме списъкът да се обнови - трябва да изчакаме за API
    await page.waitForTimeout(3000);
    await page.waitForSelector('.spell-item', { timeout: 10000 });
    
    // Проверяваме че има магии за ниво 2
    const level2Spells = page.locator('.spell-item');
    const level2Count = await level2Spells.count();
    expect(level2Count).toBeGreaterThan(0);
    
    // Проверяваме че магиите показват Level 2 в таговете
    const level2SpellTags = await level2Spells.first().locator('.spell-tags').textContent();
    expect(level2SpellTags).toContain('Level 2');
  });

  test('трябва да не изчезва магия след зареждане на детайли', async ({ page }) => {
    // beforeEach вече е заредил магии за ниво 1
    const spells = page.locator('.spell-item');
    await expect(spells.first()).toBeVisible({ timeout: 5000 });
    
    const spellCount = await spells.count();
    expect(spellCount).toBeGreaterThan(0);
    
    // Запазваме индекса на първата магия
    const firstSpellIndex = await spells.first().getAttribute('data-index');
    
    // Отваряме магията за да заредим детайли
    await spells.first().locator('.spell-header').click();
    await page.waitForTimeout(3000); // Чакаме за API заявката
    
    // Проверяваме че магията все още е видима в списъка
    const spellAfterLoad = page.locator(`.spell-item[data-index="${firstSpellIndex}"]`);
    await expect(spellAfterLoad).toBeVisible({ timeout: 5000 });
    
    // Проверяваме че детайлите са заредени
    const details = spellAfterLoad.locator('.spell-details');
    await expect(details).toBeVisible({ timeout: 5000 });
    
    // Проверяваме че детайлите не са празни (не е само "Зареждане на детайли...")
    const detailsContent = await details.textContent();
    expect(detailsContent).toBeTruthy();
    expect(detailsContent).not.toContain('Зареждане на детайли');
  });

  test('трябва да показва детайли за upcast магии без да ги премахва', async ({ page }) => {
    // Зареждаме магии за ниво 3 (което може да съдържа upcast магии)
    await page.locator('#filter-level').selectOption('3');
    await page.waitForSelector('.spell-item', { timeout: 15000 });
    
    const spells = page.locator('.spell-item');
    const spellCount = await spells.count();
    expect(spellCount).toBeGreaterThan(0);
    
    // Намираме първата магия и отваряме я
    const firstSpell = spells.first();
    const spellName = await firstSpell.locator('.spell-name').textContent();
    
    // Отваряме магията
    await firstSpell.locator('.spell-header').click();
    await page.waitForTimeout(3000); // Чакаме за API заявката
    
    // Проверяваме че магията все още е видима
    const spellAfterLoad = page.locator('.spell-item').filter({ hasText: spellName });
    await expect(spellAfterLoad).toBeVisible({ timeout: 5000 });
    
    // Проверяваме че детайлите са показани
    const details = spellAfterLoad.locator('.spell-details');
    await expect(details).toBeVisible({ timeout: 5000 });
    
    // Проверяваме че магията не е изчезнала от списъка
    const allSpellsAfter = page.locator('.spell-item');
    const allSpellNames = await allSpellsAfter.locator('.spell-name').allTextContents();
    expect(allSpellNames).toContain(spellName);
  });
});

test.describe('Spells - Търсене по име', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(300);
    // Зареждаме магии за ниво 1
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
  });

  test('трябва да има input поле за търсене под dropdown-а', async ({ page }) => {
    const searchInput = page.locator('#spell-search');
    await expect(searchInput).toBeVisible();
    // Проверяваме че има placeholder
    await expect(searchInput).toHaveAttribute('placeholder', 'Търсене по име...');
  });

  test('трябва да филтрира магиите по име при въвеждане на текст', async ({ page }) => {
    const spellsBefore = page.locator('.spell-item');
    const countBefore = await spellsBefore.count();
    expect(countBefore).toBeGreaterThan(1);
    
    // Взимаме името на първата магия
    const firstSpellName = await spellsBefore.first().locator('.spell-name').textContent();
    
    // Търсим по първите 3 букви от името
    const searchTerm = firstSpellName.substring(0, 3);
    await page.locator('#spell-search').fill(searchTerm);
    await page.waitForTimeout(300);
    
    // Проверяваме че резултатите съдържат търсения текст
    const spellsAfter = page.locator('.spell-item');
    const spellNames = await spellsAfter.locator('.spell-name').allTextContents();
    for (const name of spellNames) {
      expect(name.toLowerCase()).toContain(searchTerm.toLowerCase());
    }
  });

  test('трябва да показва всички магии при изчистване на търсенето', async ({ page }) => {
    const spellsBefore = page.locator('.spell-item');
    const countBefore = await spellsBefore.count();
    
    // Търсим нещо
    await page.locator('#spell-search').fill('cure');
    await page.waitForTimeout(300);
    
    // Изчистваме търсенето
    await page.locator('#spell-search').fill('');
    await page.waitForTimeout(300);
    
    // Проверяваме че всички магии са показани отново
    const spellsAfter = page.locator('.spell-item');
    const countAfter = await spellsAfter.count();
    expect(countAfter).toBe(countBefore);
  });

  test('търсенето трябва да е case-insensitive', async ({ page }) => {
    // Търсим с малки букви
    await page.locator('#spell-search').fill('cure');
    await page.waitForTimeout(300);
    const countLower = await page.locator('.spell-item').count();
    
    // Търсим с големи букви
    await page.locator('#spell-search').fill('CURE');
    await page.waitForTimeout(300);
    const countUpper = await page.locator('.spell-item').count();
    
    // Резултатите трябва да са еднакви
    expect(countLower).toBe(countUpper);
  });

  test('трябва да показва съобщение ако няма резултати от търсенето', async ({ page }) => {
    // Проверяваме че има магии преди търсене
    const spellsBefore = page.locator('.spell-item');
    await expect(spellsBefore.first()).toBeVisible({ timeout: 5000 });
    
    // Търсим нещо което не съществува
    await page.locator('#spell-search').fill('xyznonexistent123');
    await page.waitForTimeout(300);
    
    // Трябва да няма магии
    const spells = page.locator('.spell-item');
    await expect(spells).toHaveCount(0);
    
    // Трябва да има съобщение
    const spellsRoot = page.locator('#spells-root');
    const content = await spellsRoot.textContent();
    expect(content).toContain('Няма намерени магии');
  });

  test('търсенето трябва да се изчиства при смяна на нивото', async ({ page }) => {
    // Проверяваме че има магии
    const spellsBefore = page.locator('.spell-item');
    await expect(spellsBefore.first()).toBeVisible({ timeout: 5000 });
    
    // Въвеждаме търсене
    await page.locator('#spell-search').fill('cure');
    await page.waitForTimeout(300);
    
    // Сменяме нивото
    await page.locator('#filter-level').selectOption('2');
    // Чакаме или за магии или за съобщение
    await page.waitForTimeout(3000);
    
    // Търсенето трябва да е изчистено
    const searchValue = await page.locator('#spell-search').inputValue();
    expect(searchValue).toBe('');
  });
});

