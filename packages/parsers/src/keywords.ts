/**
 * @careermate/parsers — built-in tech keyword dictionary.
 *
 * A small, curated list of common technologies. Each entry maps a canonical
 * display label to the regex-safe aliases we accept when scanning free text.
 * Matching is word-boundary aware and case-insensitive. This is intentionally
 * conservative: it favors precision over recall so we don't flood the user with
 * noise.
 */

export interface TechTerm {
  /** Canonical label shown back to the user. */
  label: string;
  /** Alternate spellings (regex-escaped literally, no special chars expected). */
  aliases?: string[];
}

export const TECH_TERMS: TechTerm[] = [
  // Languages
  { label: 'JavaScript', aliases: ['js'] },
  { label: 'TypeScript', aliases: ['ts'] },
  { label: 'Python' },
  { label: 'Java' },
  { label: 'Kotlin' },
  { label: 'Go', aliases: ['golang'] },
  { label: 'Rust' },
  { label: 'C++', aliases: ['cpp'] },
  { label: 'C#', aliases: ['csharp'] },
  { label: 'C' },
  { label: 'Ruby' },
  { label: 'PHP' },
  { label: 'Swift' },
  { label: 'Scala' },
  { label: 'Dart' },
  { label: 'SQL' },
  { label: 'GraphQL' },

  // Frontend frameworks/libs
  { label: 'React', aliases: ['react.js', 'reactjs'] },
  { label: 'Next.js', aliases: ['nextjs', 'next js'] },
  { label: 'Vue', aliases: ['vue.js', 'vuejs'] },
  { label: 'Nuxt', aliases: ['nuxt.js', 'nuxtjs'] },
  { label: 'Angular' },
  { label: 'Svelte' },
  { label: 'Redux' },
  { label: 'Tailwind', aliases: ['tailwindcss', 'tailwind css'] },

  // Backend frameworks
  { label: 'Node.js', aliases: ['nodejs', 'node js', 'node'] },
  { label: 'Express', aliases: ['express.js', 'expressjs'] },
  { label: 'NestJS', aliases: ['nest.js', 'nest js'] },
  { label: 'Spring', aliases: ['spring boot', 'springboot'] },
  { label: 'Django' },
  { label: 'Flask' },
  { label: 'FastAPI' },
  { label: 'Rails', aliases: ['ruby on rails'] },
  { label: 'Laravel' },
  { label: '.NET', aliases: ['dotnet', 'asp.net'] },

  // Datastores
  { label: 'PostgreSQL', aliases: ['postgres', 'postgresql'] },
  { label: 'MySQL' },
  { label: 'MariaDB' },
  { label: 'MongoDB', aliases: ['mongo'] },
  { label: 'Redis' },
  { label: 'Elasticsearch', aliases: ['elastic search'] },
  { label: 'Oracle' },
  { label: 'SQLite' },
  { label: 'Kafka' },
  { label: 'RabbitMQ' },

  // Cloud / infra / devops
  { label: 'AWS', aliases: ['amazon web services'] },
  { label: 'GCP', aliases: ['google cloud'] },
  { label: 'Azure' },
  { label: 'Docker' },
  { label: 'Kubernetes', aliases: ['k8s'] },
  { label: 'Terraform' },
  { label: 'Jenkins' },
  { label: 'GitHub Actions', aliases: ['github action'] },
  { label: 'CI/CD', aliases: ['cicd'] },
  { label: 'Nginx' },
  { label: 'Linux' },

  // Tooling / misc
  { label: 'Git' },
  { label: 'REST', aliases: ['rest api', 'restful'] },
  { label: 'gRPC' },
  { label: 'Webpack' },
  { label: 'Vite' },
  { label: 'Jest' },
  { label: 'Figma' },
  { label: 'Jira' },

  // Data / ML
  { label: 'TensorFlow' },
  { label: 'PyTorch' },
  { label: 'Pandas' },
  { label: 'NumPy', aliases: ['numpy'] },
  { label: 'Spark', aliases: ['apache spark'] },
  { label: 'Airflow' },
];

/** Escape a literal string for safe inclusion in a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Decide whether a term needs ASCII word boundaries. Terms with trailing
 * special chars (C++, C#, .NET) can't use `\b` reliably, so we anchor on
 * non-word-ish neighbors instead.
 */
function buildPattern(term: string): RegExp {
  const esc = escapeRegExp(term);
  // If the term is purely word characters, use real word boundaries.
  if (/^[\w.]+$/.test(term) && /\w$/.test(term) && /^\w/.test(term)) {
    return new RegExp(`(?<![\\w])${esc}(?![\\w])`, 'i');
  }
  // Otherwise require a non-letter/digit (or string edge) on each side so we
  // don't match inside larger words.
  return new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'i');
}

/**
 * Scan text and return canonical labels of tech terms found, de-duplicated and
 * preserving the dictionary's order. Best-effort; never throws.
 */
export function extractTechKeywords(text: string, limit = 20): string[] {
  if (!text) return [];
  const found: string[] = [];
  const seen = new Set<string>();

  for (const term of TECH_TERMS) {
    if (seen.has(term.label)) continue;
    const candidates = [term.label, ...(term.aliases ?? [])];
    const matched = candidates.some((c) => {
      try {
        return buildPattern(c).test(text);
      } catch {
        return false;
      }
    });
    if (matched) {
      seen.add(term.label);
      found.push(term.label);
      if (found.length >= limit) break;
    }
  }
  return found;
}
