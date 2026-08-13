const fs = require('fs');
const FILES = [
  'src/components/DeepDive/BatchDetailView.js',
  'src/components/DeepDive/SectionDetailView.js',
  'src/components/DeepDive/StudentDetailView.js',
  'src/components/DeepDive/TeacherDetailView.js',
  'src/components/DeepDive/CourseDetailView.js',
];

// Order matters: longest/most specific first.
const TABLE = [
  // ---------- main card surfaces -> raised ----------
  ['bg-[var(--card)]/80 dark:bg-slate-900/80', 'neu-raised'],
  ['bg-[var(--card)]/80 dark:bg-[var(--card)]/5', 'neu-raised'],
  ['bg-[var(--card)]/80 dark:bg-[#0B0F19]/80', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-[var(--card)]/10', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-[var(--card)]/5', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-[#0f1523]', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-[#1A1F2E]', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-[#0B0F19]', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-[#121212]', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-black/20', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-black/30', 'neu-raised'],
  ['bg-[var(--card)] dark:bg-black/40', 'neu-raised'],
  // half-transparent panels -> flat
  ['bg-[var(--card)]/50 dark:bg-[var(--card)]/5', 'neu-flat'],
  ['bg-[var(--card)]/50 dark:bg-black/20', 'neu-flat'],
  ['bg-[var(--card)]/50 dark:bg-black/30', 'neu-flat'],
  ['bg-[var(--card)]/50 dark:bg-[#0f1523]/50', 'neu-flat'],

  // ---------- grooves / chips / tracks -> inset ----------
  ['bg-gray-100 dark:bg-[var(--card)]/10', 'neu-inset'],
  ['bg-gray-100 dark:bg-[var(--card)]/5', 'neu-inset'],
  ['bg-gray-100 dark:bg-[var(--card)]/3', 'neu-inset'],
  ['bg-gray-100 dark:bg-black/20', 'neu-inset'],
  ['bg-gray-100 dark:bg-black/30', 'neu-inset'],
  ['bg-gray-100 dark:bg-black/40', 'neu-inset'],
  ['bg-gray-200 dark:bg-[var(--card)]/10', 'neu-inset'],
  ['bg-gray-200 dark:bg-[var(--card)]/5', 'neu-inset'],
  ['bg-gray-50 dark:bg-[var(--card)]/5', 'neu-inset'],
  ['bg-gray-50 dark:bg-[#1a1a1a]', 'neu-inset'],
  ['bg-gray-50 dark:bg-transparent', 'neu-inset'],

  // ---------- large light panels -> flat ----------
  ['bg-gray-50 dark:bg-[#1A1F2E]', 'neu-flat'],
  ['bg-gray-50/50 dark:bg-[var(--card)]/[0.02]', 'neu-flat'],
  ['bg-gray-50/50 dark:bg-[var(--card)]/5', 'neu-flat'],
  ['bg-gray-50/50 dark:bg-black/20', 'neu-flat'],
  ['bg-gray-50/50 dark:bg-[#0B0F19]/90', 'neu-flat'],
  ['bg-gray-50/50 dark:bg-[#0f1523]', 'neu-flat'],

  // ---------- hovers: neutral tint that works on neu surface ----------
  ['hover:bg-gray-100 dark:hover:bg-[var(--card)]/5', 'hover:bg-[var(--neu-dark)]/20'],
  ['hover:bg-gray-100 dark:hover:bg-[var(--card)]/10', 'hover:bg-[var(--neu-dark)]/20'],
  ['hover:bg-gray-200 dark:hover:bg-[var(--card)]/10', 'hover:bg-[var(--neu-dark)]/25'],
  ['hover:bg-gray-50 dark:hover:bg-[var(--card)]/5', 'hover:bg-[var(--neu-dark)]/15'],
  ['hover:bg-gray-50/50 dark:hover:bg-[var(--card)]/[0.02]', 'hover:bg-[var(--neu-dark)]/15'],
];

const report = {};
for (const f of FILES) {
  let c = fs.readFileSync(f, 'utf8');
  let n = 0;
  for (const [from, to] of TABLE) {
    const k = c.split(from).length - 1;
    if (k) { c = c.split(from).join(to); n += k; }
  }
  fs.writeFileSync(f, c, 'utf8');
  report[f] = n;
}
Object.entries(report).forEach(([f, n]) => console.log(`${n}\t${f}`));

// Verify: any remaining var(--card) surface pairs?
for (const f of FILES) {
  const c = fs.readFileSync(f, 'utf8');
  const left = c.match(/bg-\[var\(--card\)\][^"'\s]*( dark:bg-[^"'\s]+)?/g) || [];
  const pairs = left.filter(s => s.includes('dark:'));
  if (pairs.length) console.log('LEFT', f, [...new Set(pairs)].join(' | '));
}
console.log('DONE');
