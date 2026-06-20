// scripts/check-i18n-keys.mjs — 모든 카탈로그가 동일 키 집합을 갖는지, en 복수 객체가
// Intl.PluralRules('en') 범주를 모두 갖는지, ko에 복수 객체가 없는지 검사. 실패 시 exit(1).
// npm test 맨 앞에 연결되어 카탈로그를 단일 출처로 강제한다(라이브러리 추출기 대체).
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DIR = path.resolve('apps/web/public/i18n');
const LOCALES = ['ko', 'en'];

async function loadCatalog(loc) {
  const mod = await import(pathToFileURL(path.join(DIR, `${loc}.js`)).href);
  return mod.default;
}

const cats = Object.fromEntries(await Promise.all(LOCALES.map(async (l) => [l, await loadCatalog(l)])));
const allKeys = new Set(LOCALES.flatMap((l) => Object.keys(cats[l])));

const errors = [];
for (const key of allKeys) {
  for (const loc of LOCALES) {
    if (!(key in cats[loc])) errors.push(`[missing] ${loc}.js lacks "${key}"`);
  }
}

// en 복수 객체는 Intl.PluralRules('en') 범주를 모두 가져야 한다.
const enCats = new Intl.PluralRules('en').resolvedOptions().pluralCategories; // ['one','other']
for (const [key, val] of Object.entries(cats.en)) {
  if (val && typeof val === 'object') {
    for (const cat of enCats) {
      if (!(cat in val)) errors.push(`[plural] en.js "${key}" missing category "${cat}"`);
    }
  }
}
// ko엔 복수 객체가 있으면 안 된다(항상 'other').
for (const [key, val] of Object.entries(cats.ko)) {
  if (val && typeof val === 'object') errors.push(`[plural] ko.js "${key}" must be a string, not a plural object`);
}

if (errors.length) {
  console.error('i18n key check FAILED:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`i18n key check OK — ${allKeys.size} keys across ${LOCALES.join('/')}`);
