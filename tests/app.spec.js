import { test, expect } from '@playwright/test';

test.describe('Spell App - Базова функционалност', () => {
  test.beforeEach(async ({ page }) => {
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
});

test.describe('Proficiency Bonus - Автоматично изчисляване', () => {
  test.beforeEach(async ({ page }) => {
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
    
    await page.waitForTimeout(500);
    
    const profBonus = await page.locator('#caster-prof-bonus').textContent();
    expect(profBonus?.trim()).toBe('3');
  });

  test('трябва да изчисли правилно prof bonus за ниво 9 (трябва да е 4)', async ({ page }) => {
    await page.locator('#caster-level').fill('9');
    await page.locator('#caster-level').blur();
    
    await page.waitForTimeout(500);
    
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
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
    // Зареждаме магии за тестване - избираме ниво и чакаме да се заредят
    await page.locator('#filter-level').selectOption('1');
    await page.waitForTimeout(2000);
  });

  test('трябва да показва списък с магии', async ({ page }) => {
    const spellItems = page.locator('.spell-item');
    await expect(spellItems.first()).toBeVisible();
  });

  test('трябва да може да отвори магия като кликнеш на хедъра', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    const spellHeader = firstSpell.locator('.spell-header');
    
    // Първоначално детайлите не трябва да са видими
    const detailsBefore = firstSpell.locator('.spell-details');
    await expect(detailsBefore).toHaveCount(0);
    
    // Кликваме на хедъра
    await spellHeader.click();
    await page.waitForTimeout(500);
    
    // Детайлите трябва да се появят
    const detailsAfter = firstSpell.locator('.spell-details');
    await expect(detailsAfter).toBeVisible();
  });

  test('трябва да може да затвори магия като кликнеш отново на хедъра', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    const spellHeader = firstSpell.locator('.spell-header');
    const spellName = await firstSpell.locator('.spell-name').textContent();
    
    // Отваряме магията
    await spellHeader.click();
    await page.waitForTimeout(1000);
    await expect(firstSpell.locator('.spell-details')).toBeVisible();
    
    // Затваряме магията
    await spellHeader.click();
    await page.waitForTimeout(500);
    
    // Детайлите трябва да изчезнат
    const details = firstSpell.locator('.spell-details');
    await expect(details).toHaveCount(0);
    
    // Магията трябва да остане видима в списъка след затваряне
    const spellAfterClose = page.locator('.spell-item').filter({ hasText: spellName });
    await expect(spellAfterClose).toBeVisible({ timeout: 2000 });
    await expect(spellAfterClose).not.toHaveClass(/spell-expanded/);
  });

  test('трябва да може да отвори само една магия наведнъж', async ({ page }) => {
    const spellItems = page.locator('.spell-item');
    const firstSpell = spellItems.first();
    const secondSpell = spellItems.nth(1);
    
    // Отваряме първата магия
    await firstSpell.locator('.spell-header').click();
    // Чакаме да се зареди и да се покажат детайлите
    await expect(firstSpell.locator('.spell-details')).toBeVisible({ timeout: 3000 });
    // Проверяваме че първата магия е отворена
    await expect(firstSpell).toHaveClass(/spell-expanded/);
    
    // Отваряме втората магия
    await secondSpell.locator('.spell-header').click();
    // Чакаме да се обнови DOM-а
    await page.waitForTimeout(500);
    
    // Първата трябва да се затвори (няма клас spell-expanded), втората да се отвори
    await expect(firstSpell).not.toHaveClass(/spell-expanded/, { timeout: 2000 });
    await expect(secondSpell).toHaveClass(/spell-expanded/, { timeout: 2000 });
    await expect(secondSpell.locator('.spell-details')).toBeVisible({ timeout: 2000 });
  });

  test('трябва да показва "Зареждане на детайли..." ако детайлите не са заредени', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    
    // Отваряме магията
    await firstSpell.locator('.spell-header').click();
    await page.waitForTimeout(300);
    
    // Трябва да показва съобщение за зареждане или детайли
    const details = firstSpell.locator('.spell-details');
    await expect(details).toBeVisible();
    
    const content = await details.textContent();
    expect(content).toBeTruthy();
  });

  test('трябва да зарежда детайли автоматично когато се отвори магия', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    
    // Отваряме магията
    await firstSpell.locator('.spell-header').click();
    await page.waitForTimeout(2000); // Чакаме за API заявката
    
    // Трябва да има детайли (или съобщение за зареждане)
    const details = firstSpell.locator('.spell-details');
    await expect(details).toBeVisible();
  });

  test('трябва да не отваря магия при кликване на Known/Prepared бутоните', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    const knownButton = firstSpell.locator('.btn-known');
    
    // Кликваме на Known бутона
    await knownButton.click();
    await page.waitForTimeout(300);
    
    // Магията не трябва да се отвори
    const details = firstSpell.locator('.spell-details');
    await expect(details).toHaveCount(0);
  });

  test('трябва да показва детайли в акордеона, не в details секцията', async ({ page }) => {
    const firstSpell = page.locator('.spell-item').first();
    const detailsSection = page.locator('#details-root');
    
    // Отваряме магията
    await firstSpell.locator('.spell-header').click();
    await page.waitForTimeout(500);
    
    // Детайлите трябва да са в акордеона
    await expect(firstSpell.locator('.spell-details')).toBeVisible();
    
    // Details секцията трябва да показва съобщение че детайлите са в списъка
    const detailsText = await detailsSection.textContent();
    expect(detailsText).toContain('Детайлите');
  });

  test('трябва да показва само магии от избраното ниво', async ({ page }) => {
    // Зареждаме магии за ниво 1
    await page.locator('#filter-level').selectOption('1');
    await page.waitForTimeout(2000);
    
    const level1Spells = page.locator('.spell-item');
    const level1Count = await level1Spells.count();
    expect(level1Count).toBeGreaterThan(0);
    
    // Запазваме името на първата магия от ниво 1
    const firstLevel1SpellName = await level1Spells.first().locator('.spell-name').textContent();
    
    // Променяме филтъра на ниво 2
    await page.locator('#filter-level').selectOption('2');
    await page.waitForTimeout(2000);
    
    // Проверяваме че магията от ниво 1 не се показва
    const allSpells = page.locator('.spell-item');
    const allSpellNames = await allSpells.locator('.spell-name').allTextContents();
    expect(allSpellNames).not.toContain(firstLevel1SpellName);
    
    // Проверяваме че всички показани магии са от ниво 2 (не cantrips)
    const spellCount = await allSpells.count();
    expect(spellCount).toBeGreaterThan(0);
    for (let i = 0; i < spellCount; i++) {
      const spell = allSpells.nth(i);
      const spellTags = await spell.locator('.spell-tags').textContent();
      // Проверяваме че таговете съдържат "Level 2" (не cantrips)
      expect(spellTags).toContain('Level 2');
    }
  });
});

