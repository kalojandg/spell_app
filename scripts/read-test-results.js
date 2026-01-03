// Скрипт за четене на test results от JSON файла
// Използване: node scripts/read-test-results.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resultsPath = path.join(__dirname, '..', 'test-results', 'results.json');

if (!fs.existsSync(resultsPath)) {
  console.log('Няма налични test results. Пусни тестовете първо с: npm test');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

const stats = results.stats;
const total = stats.expected + stats.unexpected + stats.skipped;

console.log('\n=== Test Results Summary ===\n');
console.log(`Общо тестове: ${total}`);
console.log(`Успешни: ${stats.expected}`);
console.log(`Провалени: ${stats.unexpected}`);
console.log(`Пропуснати: ${stats.skipped}`);
console.log(`Време: ${(stats.duration / 1000).toFixed(2)}s\n`);

if (stats.unexpected > 0) {
  console.log('=== Провалени тестове ===\n');
  
  function traverseSuites(suites) {
    if (!suites || !Array.isArray(suites)) return;
    
    suites.forEach(suite => {
      if (suite.specs && Array.isArray(suite.specs)) {
        suite.specs.forEach(spec => {
          if (spec.tests && Array.isArray(spec.tests)) {
            spec.tests.forEach(test => {
              if (test.results && test.results.some(r => r.status === 'failed')) {
                console.log(`❌ ${spec.title} > ${test.title}`);
                test.results.forEach(result => {
                  if (result.status === 'failed') {
                    if (result.error) {
                      console.log(`   Грешка: ${result.error.message}`);
                      if (result.error.location) {
                        console.log(`   Файл: ${result.error.location.file}:${result.error.location.line}`);
                      }
                      if (result.error.snippet) {
                        console.log(`   Код: ${result.error.snippet}`);
                      }
                    }
                  }
                });
                console.log('');
              }
            });
          }
        });
      }
      
      // Рекурсивно обхождане на вложени suites
      if (suite.suites) {
        traverseSuites(suite.suites);
      }
    });
  }
  
  traverseSuites(results.suites);
}

if (stats.unexpected === 0) {
  console.log('✅ Всички тестове минават успешно!\n');
}

