# Spell App - PoC

D&D Spellbook приложение за управление на магии.

**Чист JavaScript, CSS, HTML** - без библиотеки или фреймуърци в бъндъла.

## Инсталация

```bash
npm install
```

## Разработка

За да пуснеш статичен сървър с hot reload:

```bash
npm run dev
```

Сървърът ще се отвори автоматично на `http://localhost:3000` и ще рефрешва автоматично при промяна на файловете.

## Тестове

Тестовете използват Playwright (E2E тестове в браузър).

За да пуснеш тестовете:

```bash
npm test
```

За да пуснеш тестовете с UI (интерактивен интерфейс):

```bash
npm run test:ui
```

За да пуснеш тестовете в headed режим (виждаш браузъра):

```bash
npm run test:headed
```

За да дебъгваш тестове:

```bash
npm run test:debug
```

За да видиш резултатите от последния тест (от файл):

```bash
npm run test:results
```

**Забележка:** Playwright автоматично ще пусне сървъра преди тестовете, но можеш да го пуснеш ръчно с `npm run dev` ако искаш да виждаш ап-а докато пишеш тестове.

**Логиране:** След всеки тест, резултатите се записват в:
- `test-results/results.json` - JSON формат с пълни детайли
- `playwright-report/index.html` - HTML репорт (отвори с `npx playwright show-report`)

## Структура

```
spell_app/
├── index.html          # HTML структура
├── styles.css          # CSS стилове
├── js/                 # JavaScript модули
│   ├── state.js        # Управление на state и persistence
│   ├── api.js          # API заявки към D&D 5e API
│   ├── caster.js       # Логика за Caster панела
│   ├── slots.js        # Логика за Spell Slots панела
│   ├── spells.js       # Логика за Spells панела
│   ├── details.js      # Логика за Details панела
│   └── app.js          # Главен файл - инициализация
├── tests/              # Тестове (само за разработка)
│   └── app.spec.js     # E2E тестове
├── playwright.config.js # Конфигурация за Playwright
└── package.json        # Зависимости и scripts
```

### Модулна структура

Приложението е разделено на модули по функционалности:
- **state.js** - управление на състоянието и localStorage
- **api.js** - всички API заявки
- **caster.js** - рендериране и логика за Caster панела
- **slots.js** - рендериране и логика за Spell Slots панела
- **spells.js** - рендериране и логика за Spells панела
- **details.js** - рендериране и логика за Details панела
- **app.js** - главен файл който инициализира всичко

## TDD подход

Тъй като това е PoC, тестовете ще се добавят постепенно, докато виждаш как изглежда ап. Започни с `npm run dev` и след това добавяй тестове в `tests/app.spec.js` според нуждите.

