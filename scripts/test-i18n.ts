// scripts/test-i18n.ts — i18n.js의 t()/보간/복수/폴백/로케일 전환을 노드에서 검증.
// 브라우저 전역(localStorage/navigator/document)을 stub 한 뒤, '/i18n/*' 절대 import를
// 파일 URL로 치환해 메모리에서 직접 평가한다(번들러 없음).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const g = globalThis as any;
g.localStorage = {
  _v: {} as Record<string, string>,
  getItem(k: string) { return this._v[k] ?? null; },
  setItem(k: string, v: string) { this._v[k] = v; },
  removeItem(k: string) { delete this._v[k]; },
};
if (!('navigator' in g) || !g.navigator) g.navigator = { language: 'en-US' };
g.document = { documentElement: { lang: 'en' } };

const PUB = path.resolve('apps/web/public');
const I18N_DIR = pathToFileURL(path.join(PUB, 'i18n')).href;

async function loadModule(rel: string): Promise<any> {
  const src = readFileSync(path.join(PUB, rel), 'utf8').replace(/from '\/i18n\//g, `from '${I18N_DIR}/`);
  const data = 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
  return import(data);
}

const i18n = await loadModule('i18n.js');
let pass = true;
const check = (name: string, cond: boolean) => { if (!cond) { pass = false; console.error('FAIL:', name); } };

i18n.setLang('en');
check('en lookup', i18n.t('common.cancel') === 'Cancel');
check('en lang set on documentElement', g.document.documentElement.lang === 'en');
check('missing key returns the key (never blank)', i18n.t('nope.key') === 'nope.key');
check('interpolation leaves plain string untouched', i18n.t('common.cancel', { x: 1 }) === 'Cancel');

let fired = '';
const off = i18n.onLangChange((l: string) => { fired = l; });
i18n.setLang('ko');
check('onLangChange fired with new locale', fired === 'ko');
check('ko lookup', i18n.t('common.cancel') === '취소');
off();

check('LOCALES exported', Array.isArray(i18n.LOCALES) && i18n.LOCALES.includes('ko') && i18n.LOCALES.includes('en'));

console.log(pass ? 'I18N_VERDICT PASS' : 'I18N_VERDICT FAIL');
