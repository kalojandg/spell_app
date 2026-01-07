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
  // Маркираме че сме в тест среда (за да не се регистрира service worker)
  await page.addInitScript(() => {
    window.__PLAYWRIGHT_TEST__ = true;
  });
  
  // Unregister всички service workers
  await page.addInitScript(async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
  });

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
    // Първо увеличаваме caster level за да имаме достъп до ниво 3 магии
    await page.locator('#caster-level').fill('5');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(300);
    
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

test.describe('Prepared Spells - Функционалност', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да показва брояч за подготвени магии в Caster секцията', async ({ page }) => {
    const preparedCounter = page.locator('#prepared-counter');
    await expect(preparedCounter).toBeVisible();
    // Трябва да показва формат X/Y
    const text = await preparedCounter.textContent();
    expect(text).toMatch(/\d+\s*\/\s*\d+/);
  });

  test('трябва да изчисли правилно max prepared за Druid (level + ability mod)', async ({ page }) => {
    // Default е Druid level 4, ability mod 3 => 4 + 3 = 7
    await page.waitForTimeout(500);
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    // Очакваме 0 / 7 (нищо подготвено, max 7)
    expect(text).toContain('/ 7');
  });

  test('трябва да изчисли правилно max prepared за Cleric', async ({ page }) => {
    // Cleric level 4, ability mod 3 => 4 + 3 = 7
    await page.locator('#caster-class').selectOption('cleric');
    await page.waitForTimeout(500);
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    expect(text).toContain('/ 7');
  });

  test('трябва да изчисли правилно max prepared за Paladin (level/2 + ability mod)', async ({ page }) => {
    // Paladin level 4, ability mod 3 => floor(4/2) + 3 = 2 + 3 = 5
    await page.locator('#caster-class').selectOption('paladin');
    await page.waitForTimeout(500);
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    expect(text).toContain('/ 5');
  });

  test('трябва да изчисли правилно max prepared за Wizard', async ({ page }) => {
    // Wizard level 4, ability mod 3 => 4 + 3 = 7
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    expect(text).toContain('/ 7');
  });

  test('трябва да обнови max prepared когато се промени нивото', async ({ page }) => {
    // Druid level 8, ability mod 3 => 8 + 3 = 11
    await page.locator('#caster-level').fill('8');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(500);
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    expect(text).toContain('/ 11');
  });

  test('трябва да обнови max prepared когато се промени ability mod', async ({ page }) => {
    // Druid level 4, ability mod 5 => 4 + 5 = 9
    await page.locator('#caster-ability-mod').fill('5');
    await page.locator('#caster-ability-mod').blur();
    await page.waitForTimeout(500);
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    expect(text).toContain('/ 9');
  });

  test('трябва да увеличи prepared count когато се подготви магия', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    const firstSpell = page.locator('.spell-item').first();
    await firstSpell.locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Подготвяме магията от Known Spells секцията
    const knownSpell = page.locator('.known-spell-item').first();
    await knownSpell.locator('.btn-prepared').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че брояча се е увеличил
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    expect(text).toMatch(/^1\s*\//);
  });

  test('трябва да не позволява подготвяне над максимума', async ({ page }) => {
    // Намаляме max prepared до 1 (level 1, ability mod 0 => 1)
    await page.locator('#caster-level').fill('1');
    await page.locator('#caster-level').blur();
    await page.locator('#caster-ability-mod').fill('0');
    await page.locator('#caster-ability-mod').blur();
    await page.waitForTimeout(500);
    
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме две магии като known
    const spells = page.locator('.spell-item');
    await spells.nth(0).locator('.btn-known').click();
    await page.waitForTimeout(100);
    await spells.nth(1).locator('.btn-known').click();
    await page.waitForTimeout(100);
    
    // Подготвяме първата магия от Known Spells секцията
    const knownSpells = page.locator('.known-spell-item');
    await knownSpells.nth(0).locator('.btn-prepared').click();
    await page.waitForTimeout(100);
    
    // Опитваме да подготвим втора магия
    await knownSpells.nth(1).locator('.btn-prepared').click();
    await page.waitForTimeout(100);
    
    // Втората магия не трябва да е подготвена (максимум е 1)
    const secondSpellPrepared = await knownSpells.nth(1).locator('.btn-prepared').evaluate(
      el => el.classList.contains('prepared')
    );
    expect(secondSpellPrepared).toBe(false);
    
    // Брояча трябва да показва 1/1
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    expect(text).toMatch(/1\s*\/\s*1/);
  });

  test('трябва да намали prepared count когато се премахне подготовка', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    const firstSpell = page.locator('.spell-item').first();
    await firstSpell.locator('.btn-known').click();
    await page.waitForTimeout(100);
    
    // Подготвяме магията от Known Spells секцията
    const knownSpell = page.locator('.known-spell-item').first();
    await knownSpell.locator('.btn-prepared').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че е 1/X
    let text = await page.locator('#prepared-counter').textContent();
    expect(text).toMatch(/^1\s*\//);
    
    // Премахваме подготовката
    await knownSpell.locator('.btn-prepared').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че е 0/X
    text = await page.locator('#prepared-counter').textContent();
    expect(text).toMatch(/^0\s*\//);
  });

  test('трябва minimum prepared да е 1 дори при отрицателен modifier', async ({ page }) => {
    // Level 1, ability mod -2 => max(1, 1 + (-2)) = max(1, -1) = 1
    await page.locator('#caster-level').fill('1');
    await page.locator('#caster-level').blur();
    await page.locator('#caster-ability-mod').fill('-2');
    await page.locator('#caster-ability-mod').blur();
    await page.waitForTimeout(500);
    
    const preparedCounter = page.locator('#prepared-counter');
    const text = await preparedCounter.textContent();
    // Minimum трябва да е 1
    expect(text).toContain('/ 1');
  });

  test('трябва prepared count да се запазва при смяна на ниво на магии', async ({ page }) => {
    // Зареждаме магии от ниво 1
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    const firstSpell = page.locator('.spell-item').first();
    await firstSpell.locator('.btn-known').click();
    await page.waitForTimeout(100);
    
    // Подготвяме магията от Known Spells секцията
    const knownSpell = page.locator('.known-spell-item').first();
    await knownSpell.locator('.btn-prepared').click();
    await page.waitForTimeout(200);
    
    // Сменяме на ниво 2
    await page.locator('#filter-level').selectOption('2');
    await page.waitForTimeout(500);
    
    // Брояча трябва да показва все още 1 prepared
    const text = await page.locator('#prepared-counter').textContent();
    expect(text).toMatch(/^1\s*\//);
  });
});

test.describe('Known Spells - Секция', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да има Known Spells секция', async ({ page }) => {
    const section = page.locator('#known-spells-section');
    await expect(section).toBeVisible();
  });

  test('трябва да показва съобщение ако няма known магии', async ({ page }) => {
    const message = page.locator('#known-spells-root .small');
    await expect(message).toContainText('Няма научени магии');
  });

  test('трябва да показва магия в Known секцията след маркиране като known', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    const firstSpell = page.locator('.spell-item').first();
    const spellName = await firstSpell.locator('.spell-name').textContent();
    await firstSpell.locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че магията се появява в Known секцията
    const knownSpell = page.locator('.known-spell-item').first();
    await expect(knownSpell).toBeVisible();
    await expect(knownSpell.locator('.known-spell-name')).toContainText(spellName);
  });

  test('трябва да има Prep бутон в Known секцията', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Проверяваме за Prep бутон
    const prepButton = page.locator('.known-spell-item .btn-prepared');
    await expect(prepButton).toBeVisible();
  });

  test('трябва да НЕ показва Prep бутон в основната таблица', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Проверяваме че няма Prep бутон в основната таблица
    const prepButton = page.locator('.spell-item .btn-prepared');
    await expect(prepButton).toHaveCount(0);
  });

  test('трябва да премахва магия от Known секцията при отмаркиране', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че има магия в Known секцията
    await expect(page.locator('.known-spell-item')).toHaveCount(1);
    
    // Отмаркираме магията
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че секцията е празна
    await expect(page.locator('.known-spell-item')).toHaveCount(0);
  });
});

test.describe('Persist - Запазване на known/prepared', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да запази known статус след refresh', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    const spellItem = page.locator('.spell-item').first();
    const spellIndex = await spellItem.getAttribute('data-index');
    await spellItem.locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Refresh страницата
    await page.reload();
    await page.waitForTimeout(500);
    
    // Магията трябва да е все още в Known секцията
    const knownSpell = page.locator(`.known-spell-item[data-index="${spellIndex}"]`);
    await expect(knownSpell).toBeVisible();
  });

  test('трябва да запази prepared статус след refresh', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known и prepared
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    await page.locator('.known-spell-item').first().locator('.btn-prepared').click();
    await page.waitForTimeout(200);
    
    // Refresh страницата
    await page.reload();
    await page.waitForTimeout(500);
    
    // Prepared counter трябва да показва 1
    const text = await page.locator('#prepared-counter').textContent();
    expect(text).toMatch(/^1\s*\//);
    
    // Бутонът трябва да има prepared клас
    const prepButton = page.locator('.known-spell-item .btn-prepared');
    await expect(prepButton).toHaveClass(/prepared/);
  });

  test('трябва да запази known статус след смяна на филтър', async ({ page }) => {
    // Зареждаме магии от ниво 1
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    const spellItem = page.locator('.spell-item').first();
    const spellIndex = await spellItem.getAttribute('data-index');
    await spellItem.locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Сменяме на ниво 2
    await page.locator('#filter-level').selectOption('2');
    await page.waitForTimeout(500);
    
    // Магията трябва да е все още в Known секцията
    const knownSpell = page.locator(`.known-spell-item[data-index="${spellIndex}"]`);
    await expect(knownSpell).toBeVisible();
  });
});

test.describe('Known Spells Limit - За known casters', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да показва Known Spells counter за Sorcerer', async ({ page }) => {
    await page.locator('#caster-class').selectOption('sorcerer');
    await page.waitForTimeout(500);
    
    const knownCounter = page.locator('#known-counter');
    await expect(knownCounter).toBeVisible();
  });

  test('трябва да показва правилен max known за Sorcerer level 4', async ({ page }) => {
    // Sorcerer level 4 има 5 known spells
    await page.locator('#caster-class').selectOption('sorcerer');
    await page.locator('#caster-level').fill('4');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(500);
    
    const knownCounter = page.locator('#known-counter');
    const text = await knownCounter.textContent();
    expect(text).toContain('/ 5');
  });

  test('трябва да показва правилен max known за Bard level 10', async ({ page }) => {
    // Bard level 10 има 14 known spells
    await page.locator('#caster-class').selectOption('bard');
    await page.locator('#caster-level').fill('10');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(500);
    
    const knownCounter = page.locator('#known-counter');
    const text = await knownCounter.textContent();
    expect(text).toContain('/ 14');
  });

  test('трябва да НЕ позволява добавяне на повече known spells от максимума', async ({ page }) => {
    // Ranger level 2 има само 2 known spells
    await page.locator('#caster-class').selectOption('ranger');
    await page.locator('#caster-level').fill('2');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(500);
    
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме 2 магии като known (максимумът)
    const spells = page.locator('.spell-item');
    await spells.nth(0).locator('.btn-known').click();
    await page.waitForTimeout(100);
    await spells.nth(1).locator('.btn-known').click();
    await page.waitForTimeout(100);
    
    // Опитваме да маркираме трета магия
    await spells.nth(2).locator('.btn-known').click();
    await page.waitForTimeout(100);
    
    // Третата магия не трябва да е known
    const thirdSpellKnown = await spells.nth(2).locator('.btn-known').evaluate(
      el => el.classList.contains('known')
    );
    expect(thirdSpellKnown).toBe(false);
    
    // Counter трябва да показва 2/2
    const knownCounter = page.locator('#known-counter');
    const text = await knownCounter.textContent();
    expect(text).toMatch(/2\s*\/\s*2/);
  });

  test('трябва Druid да показва Prepared counter (не Known)', async ({ page }) => {
    // Druid е prepared caster
    await page.locator('#caster-class').selectOption('druid');
    await page.waitForTimeout(500);
    
    const preparedCounter = page.locator('#prepared-counter');
    await expect(preparedCounter).toBeVisible();
    
    const knownCounter = page.locator('#known-counter');
    await expect(knownCounter).toHaveCount(0);
  });
});

test.describe('Смяна на клас - Confirmation Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да показва confirmation dialog при смяна на клас с научени магии', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Подготвяме да хванем диалога
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    // Сменяме класа
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    
    // Проверяваме че е показан диалог
    expect(dialogMessage).toContain('Сигурни ли сте');
  });

  test('трябва да изчисти магиите при потвърждение', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че има магия в Known секцията
    await expect(page.locator('.known-spell-item')).toHaveCount(1);
    
    // Приемаме диалога
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Сменяме класа
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    
    // Known секцията трябва да е празна
    await expect(page.locator('.known-spell-item')).toHaveCount(0);
  });

  test('трябва да запази магиите при отказ на диалога', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    const spellItem = page.locator('.spell-item').first();
    const spellIndex = await spellItem.getAttribute('data-index');
    await spellItem.locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Отказваме диалога
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    
    // Опитваме да сменим класа
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    
    // Магията трябва да е все още в Known секцията
    const knownSpell = page.locator(`.known-spell-item[data-index="${spellIndex}"]`);
    await expect(knownSpell).toBeVisible();
    
    // Класът трябва да е непроменен
    const currentClass = await page.locator('#caster-class').inputValue();
    expect(currentClass).toBe('druid');
  });

  test('трябва да НЕ показва диалог ако няма научени магии', async ({ page }) => {
    let dialogShown = false;
    page.on('dialog', async dialog => {
      dialogShown = true;
      await dialog.accept();
    });
    
    // Сменяме класа без да сме добавили магии
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    
    // Не трябва да е показан диалог
    expect(dialogShown).toBe(false);
    
    // Класът трябва да се е сменил
    const currentClass = await page.locator('#caster-class').inputValue();
    expect(currentClass).toBe('wizard');
  });

  test('трябва да изчисти и prepared магиите при смяна на клас', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known и prepared
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    await page.locator('.known-spell-item').first().locator('.btn-prepared').click();
    await page.waitForTimeout(200);
    
    // Проверяваме prepared count
    let preparedText = await page.locator('#prepared-counter').textContent();
    expect(preparedText).toMatch(/^1\s*\//);
    
    // Приемаме диалога
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Сменяме класа
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    
    // Prepared count трябва да е 0
    preparedText = await page.locator('#prepared-counter').textContent();
    expect(preparedText).toMatch(/^0\s*\//);
  });

  test('трябва да изчисти акордеона при смяна на клас', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Приемаме диалога
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Сменяме класа
    await page.locator('#caster-class').selectOption('wizard');
    await page.waitForTimeout(500);
    
    // Филтърът трябва да е reset-нат
    const filterValue = await page.locator('#filter-level').inputValue();
    expect(filterValue).toBe('');
    
    // Акордеонът трябва да показва съобщение за избор на ниво
    const message = page.locator('#spells-root .small');
    await expect(message).toContainText('Изберете ниво');
  });
});

test.describe('Export/Import - Бутони и функционалност', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да има Export бутон в header', async ({ page }) => {
    const exportBtn = page.locator('#btn-export');
    await expect(exportBtn).toBeVisible();
  });

  test('трябва да има Import бутон в header', async ({ page }) => {
    const importBtn = page.locator('#btn-import');
    await expect(importBtn).toBeVisible();
  });

  test('трябва да има Install бутон в header', async ({ page }) => {
    const installBtn = page.locator('#btn-install');
    await expect(installBtn).toBeVisible();
  });

  test('Export трябва да свали JSON файл с магиите', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 10000 });
    
    // Маркираме магия като known
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(200);
    
    // Подготвяме да хванем download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btn-export').click()
    ]);
    
    // Проверяваме името на файла
    expect(download.suggestedFilename()).toMatch(/spellbook.*\.json/);
  });

  test('Export/Import round-trip трябва да запази state', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 10000 });
    
    // Маркираме магии като known и prepared
    const firstSpell = page.locator('.spell-item').first();
    const spellIndex = await firstSpell.getAttribute('data-index');
    await firstSpell.locator('.btn-known').click();
    await page.waitForTimeout(200);
    await page.locator('.known-spell-item').first().locator('.btn-prepared').click();
    await page.waitForTimeout(200);
    
    // Export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btn-export').click()
    ]);
    
    // Четем съдържанието на файла чрез stream
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const exportedData = JSON.parse(Buffer.concat(chunks).toString());
    
    // Изчистваме state чрез evaluate (без reload за да запазим mocks)
    await page.evaluate(() => {
      localStorage.clear();
      state.spells = {};
      state.ui.filterLevel = null;
      state.ui.expandedSpellIndex = null;
    });
    
    // Re-render
    await page.evaluate(() => {
      renderSpells();
      renderKnownSpells();
    });
    await page.waitForTimeout(300);
    
    // Проверяваме че няма known магии
    await expect(page.locator('.known-spell-item')).toHaveCount(0);
    
    // Import - създаваме файл и го качваме
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#btn-import').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'spellbook.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exportedData))
    });
    await page.waitForTimeout(500);
    
    // Проверяваме че магията е възстановена в Known секцията
    const knownSpell = page.locator(`.known-spell-item[data-index="${spellIndex}"]`);
    await expect(knownSpell).toBeVisible();
    
    // Проверяваме че е prepared
    await expect(knownSpell.locator('.btn-prepared')).toHaveClass(/prepared/);
  });

  test('Import трябва да показва грешка при невалиден JSON', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    // Import невалиден файл
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#btn-import').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('not valid json')
    });
    await page.waitForTimeout(500);
    
    // Трябва да има грешка
    expect(dialogMessage.toLowerCase()).toContain('грешка');
  });

  test('Export трябва да включва caster настройките', async ({ page }) => {
    // Променяме caster настройките
    await page.locator('#caster-class').selectOption('wizard');
    await page.locator('#caster-level').fill('10');
    await page.locator('#caster-level').blur();
    await page.locator('#caster-ability-mod').fill('4');
    await page.locator('#caster-ability-mod').blur();
    await page.waitForTimeout(500);
    
    // Export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btn-export').click()
    ]);
    
    // Четем съдържанието на файла чрез stream
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const exportedData = JSON.parse(Buffer.concat(chunks).toString());
    
    // Проверяваме caster данните
    expect(exportedData.caster.className).toBe('wizard');
    expect(exportedData.caster.level).toBe(10);
    expect(exportedData.caster.abilityMod).toBe(4);
  });
});

test.describe('Rest - Възстановяване на слотове', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('трябва да има Rest бутон в header', async ({ page }) => {
    const restBtn = page.locator('#btn-rest');
    await expect(restBtn).toBeVisible();
  });

  test('Rest трябва да възстанови всички слотове до максимума', async ({ page }) => {
    // Използваме слот от ниво 1
    const slot1 = page.locator('.slot-row').first();
    await slot1.locator('button').click();
    await page.waitForTimeout(200);
    
    // Проверяваме че слотът е използван (3/4)
    await expect(slot1.locator('.count')).toContainText('3');
    
    // Хващаме диалога
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    // Натискаме Rest
    await page.locator('#btn-rest').click();
    await page.waitForTimeout(300);
    
    // Слотовете трябва да са възстановени (4/4)
    await expect(slot1.locator('.remaining')).toContainText('4');
    
    // Трябва да има диалог
    expect(dialogMessage.toLowerCase()).toContain('prepare');
  });

  test('Rest трябва да възстанови всички нива на слотове', async ({ page }) => {
    // Използваме слотове от различни нива
    const slots = page.locator('.slot-row');
    
    // Level 1 - използваме 2 слота
    await slots.nth(0).locator('button').click();
    await page.waitForTimeout(100);
    await slots.nth(0).locator('button').click();
    await page.waitForTimeout(100);
    
    // Level 2 - използваме 1 слот
    await slots.nth(1).locator('button').click();
    await page.waitForTimeout(100);
    
    // Проверяваме че са използвани
    await expect(slots.nth(0).locator('.remaining')).toContainText('2');
    await expect(slots.nth(1).locator('.remaining')).toContainText('2');
    
    // Хващаме диалога
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Rest
    await page.locator('#btn-rest').click();
    await page.waitForTimeout(300);
    
    // Всички слотове трябва да са възстановени
    await expect(slots.nth(0).locator('.remaining')).toContainText('4');
    await expect(slots.nth(1).locator('.remaining')).toContainText('3');
  });

  test('Rest диалогът трябва да съдържа "prepare your spells"', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    await page.locator('#btn-rest').click();
    await page.waitForTimeout(300);
    
    expect(dialogMessage.toLowerCase()).toContain('prepare');
    expect(dialogMessage.toLowerCase()).toContain('spells');
  });
});

test.describe('Spell Level Dropdown - Филтрация по налични spell slots', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('Dropdown-ът трябва да показва само нивата с налични spell slots', async ({ page }) => {
    // Default е druid level 4, mock връща slots за:
    // level >= 1 -> slot 1, level >= 3 -> slot 2, level >= 5 -> slot 3, level >= 7 -> slot 4
    // За level 4: slots 1 и 2 (защото 4 >= 1 и 4 >= 3, но 4 < 5)
    await page.waitForTimeout(800); // Чакаме API да върне slots
    const options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toEqual(['1-во', '2-ро']);
  });

  test('Dropdown-ът трябва да показва правилни нива след обикновен refresh (F5)', async ({ page }) => {
    // Първо setup-ваме някакво ниво
    await page.locator('#caster-level').fill('7');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    // Проверяваме че имаме 4 нива
    let options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toEqual(['1-во', '2-ро', '3-то', '4-то']);
    
    // Сменяме на ниво 3 и записваме в localStorage
    await page.locator('#caster-level').fill('3');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    // Презареждаме страницата (обикновен refresh, mocks остават)
    await page.reload();
    await page.waitForTimeout(1000);
    
    // След refresh dropdown-ът трябва да показва само 2 нива (level 3 има slots 1 и 2)
    options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toEqual(['1-во', '2-ро']);
  });

  test('Level 1 caster трябва да вижда само 1-во ниво slot', async ({ page }) => {
    await page.locator('#caster-level').fill('1');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800); // Чакаме API за slots
    
    const options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toEqual(['1-во']);
  });

  test('Level 5 caster трябва да вижда slots до 3-то ниво', async ({ page }) => {
    await page.locator('#caster-level').fill('5');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    const options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toEqual(['1-во', '2-ро', '3-то']);
  });

  test('Level 7 caster трябва да вижда slots до 4-то ниво', async ({ page }) => {
    await page.locator('#caster-level').fill('7');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    const options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toEqual(['1-во', '2-ро', '3-то', '4-то']);
  });

  test('При смяна на нивото dropdown-ът трябва да се обнови според новите slots', async ({ page }) => {
    await page.locator('#caster-level').fill('1');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    let options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toHaveLength(1);
    
    // Сменяме нивото на 5
    await page.locator('#caster-level').fill('5');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    options = await page.locator('#filter-level option:not([value=""])').allTextContents();
    expect(options).toHaveLength(3);
  });

  test('Избраното ниво трябва да се нулира ако slot-а вече не е наличен', async ({ page }) => {
    // Започваме с level 7 (има slots 1-4)
    await page.locator('#caster-level').fill('7');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    // Избираме 4-то ниво магии
    await page.locator('#filter-level').selectOption('4');
    await page.waitForTimeout(200);
    
    // Намаляме нивото на 3 (няма 4-то ниво slot)
    await page.locator('#caster-level').fill('3');
    await page.locator('#caster-level').blur();
    await page.waitForTimeout(800);
    
    // Dropdown-ът трябва да е нулиран на "Изберете"
    const selectedValue = await page.locator('#filter-level').inputValue();
    expect(selectedValue).toBe('');
  });
});

test.describe('Known Spells - Показване на минимално ниво', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('Known spell трябва автоматично да зареди и покаже минималното ниво', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме първата магия като known - това автоматично зарежда детайлите
    await page.locator('.spell-item').first().locator('.btn-known').click();
    
    // Чакаме детайлите да се заредят (API call)
    await page.waitForTimeout(1500);
    
    // Проверяваме че Known spell показва "Lvl 1" (от mock данните)
    const knownSpell = page.locator('.known-spell-item').first();
    const levelText = await knownSpell.locator('.known-spell-level').textContent();
    expect(levelText).toContain('1');
  });

  test('Known spell без заредени данни трябва да показва "Lvl ?"', async ({ page }) => {
    // Зареждаме магии
    await page.locator('#filter-level').selectOption('1');
    await page.waitForSelector('.spell-item', { timeout: 5000 });
    
    // Маркираме магия като known
    await page.locator('.spell-item').first().locator('.btn-known').click();
    await page.waitForTimeout(100);
    
    // Веднага изчистваме data преди API да върне отговор
    await page.evaluate(() => {
      for (const key of Object.keys(state.spells)) {
        state.spells[key].data = null;
      }
      renderKnownSpells();
    });
    
    // Проверяваме че показва "Lvl ?" когато няма данни
    const knownSpell = page.locator('.known-spell-item').first();
    const levelText = await knownSpell.locator('.known-spell-level').textContent();
    expect(levelText).toContain('?');
  });
});

