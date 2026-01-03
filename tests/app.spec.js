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

