/**
 * Banned-pattern lexicons for the deterministic style lint (advisory only — never
 * a hard gate). Sourced from the cover-letter (R2/R3/R11) and human-writing
 * playbooks under docs/career-os/knowledge. Korean-first, because the real
 * "AI-tell" in Korean is 번역투 *grammar*, not the English `delve` wordlist.
 *
 * Each entry: a stable id, a human label, and a compiled global regex. Patterns
 * are literal alternations (no user input) → ReDoS-safe, compiled once.
 */

export interface Lexicon {
  id: string;
  label: string;
  regex: RegExp;
}

const G = (src: string, flags = 'g') => new RegExp(src, flags);

/** R2 — generic/cliché openers that make a letter swappable across companies. */
export const GENERIC_OPENERS: Lexicon = {
  id: 'generic_opener',
  label: '제너릭·상투적 도입(회사명 바꿔도 말이 되는 시작)',
  regex: G(
    [
      'i am writing to apply',
      'i have always been passionate',
      'as a recent graduate',
      'to whom it may concern',
      '지원하게 되었습니다',
      '지원합니다',
      '어릴 ?적부터',
      '보며 자랐습니다',
      '저는 .{0,10}한 사람입니다',
      '평소 .{0,14}관심이 많아',
      '항상 .{0,12}믿어',
      '데이터의 힘을 믿',
    ].join('|'),
    'gi',
  ),
};

/** R3 — empty self-describing adjectives / closers used without evidence. */
export const EMPTY_ADJECTIVES: Lexicon = {
  id: 'empty_adjective',
  label: '증거 없는 평가형 형용사·자기서술',
  regex: G(
    [
      '성실(하|한|함)',
      '책임감이 강',
      '열정(을 가지|적)',
      '소통을 잘',
      '커뮤니케이션이 원활',
      '꼼꼼(하|한|함)',
      '끈기(있|가)',
      '헌신적',
      '주도적인',
      '성장하는 인재',
      '라고 생각합니다',
      '많은 것을 배웠',
      '통해 성장',
      '기여하고 싶',
      '최선을 다',
      '보탬이 되겠',
      'team player',
      'hard-?working',
      'detail-?oriented',
      'motivated',
      'proactive',
      'dedicated',
      'diligent',
    ].join('|'),
    'gi',
  ),
};

/** Cliché phrases — empty buzz that appears in any letter. */
export const CLICHES: Lexicon = {
  id: 'cliche',
  label: 'AI 클리셰·공허한 상투어',
  regex: G(
    [
      '급변하는 시대',
      '4차 산업혁명',
      '끊임없는 노력',
      '귀사의 발전에 기여',
      '귀사',
      '소통과 협업',
      '글로벌 인재',
      '무한한 가능성',
      '한 단계 더 성장',
    ].join('|'),
  ),
};

/** 번역투 — translationese grammar; the real Korean AI-tell that vf-human-voice missed. */
export const TRANSLATIONESE: Lexicon = {
  id: 'translationese',
  label: '번역투 문법(영어 직역체)',
  regex: G(
    [
      '에 대한',
      '을 통해',
      '를 통해',
      '에 있어서',
      '라는 점에서',
      '가지고 있습니다',
      '되어졌',
      '되어집니다',
      '함으로써',
      '에 다름 아니',
      '진행하였습니다',
    ].join('|'),
  ),
};

/** Hype adverbs/adjectives — drop and let verbs/nouns carry. */
export const HYPE: Lexicon = {
  id: 'hype',
  label: '과장 수식어',
  regex: G(['매우', '정말로', '탁월(한|하게)', '성공적으로', '완벽(한|하게)', '엄청난', '획기적'].join('|')),
};

/** R11 — blind-hiring guardrail: job-irrelevant personal info (NCS 공정채용). */
export const BLIND_PII: Lexicon = {
  id: 'blind_pii',
  label: '블라인드 채용 위반 소지(직무무관 개인정보)',
  regex: G(['\\d{2,3}\\s?세', '사진\\s?첨부', '가족관계', '본적', '출신지', '생년월일'].join('|')),
};

/** All advisory style lexicons, in display order. */
export const STYLE_LEXICONS: Lexicon[] = [
  GENERIC_OPENERS,
  EMPTY_ADJECTIVES,
  CLICHES,
  TRANSLATIONESE,
  HYPE,
  BLIND_PII,
];

/** Count regex hits in already-normalized text, returning bounded snippets. */
export function countHits(lex: Lexicon, text: string, maxHits = 8): { count: number; hits: string[] } {
  const hits: string[] = [];
  let count = 0;
  for (const m of text.matchAll(lex.regex)) {
    count++;
    if (hits.length < maxHits) hits.push(m[0].trim());
  }
  return { count, hits };
}
