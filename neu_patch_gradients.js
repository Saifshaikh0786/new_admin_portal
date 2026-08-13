const fs = require('fs');
const FILES = [
  'src/components/DeepDive/BatchDetailView.js',
  'src/components/DeepDive/SectionDetailView.js',
  'src/components/DeepDive/StudentDetailView.js',
  'src/components/DeepDive/TeacherDetailView.js',
  'src/components/DeepDive/CourseDetailView.js',
];

// Gradients -> flat semantic token fills (soft-UI: one calm accent per meaning, no rainbows)
const TABLE = [
  // Primary/brand CTAs and tiles (violet/purple/blue/cyan saturated gradients)
  ['bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-r from-violet-600 to-purple-600', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-br from-violet-500 to-purple-600', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-br from-violet-400 to-purple-500', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-r from-rose-500 to-purple-600', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-br from-cyan-500 to-blue-600', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-br from-cyan-500 to-blue-500', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-br from-blue-500 to-indigo-500', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-br from-blue-500 to-cyan-500', 'bg-[var(--neu-accent)]'],
  ['bg-gradient-to-r from-blue-500 to-blue-600', 'bg-[var(--neu-accent)]'],

  // Achievement (trophy/amber) -> warn accent solid
  ['bg-gradient-to-r from-amber-500 to-yellow-500', 'bg-[var(--neu-warn)]'],
  ['bg-gradient-to-r from-amber-600 to-amber-700', 'bg-[var(--neu-warn)]'],
  ['bg-gradient-to-r from-yellow-400 to-amber-500', 'bg-[var(--neu-warn)]'],
  ['bg-gradient-to-br from-yellow-400 to-amber-500', 'bg-[var(--neu-warn)]'],

  // Neutral gradients -> inset/flat
  ['bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700', 'neu-inset'],
  ['bg-gradient-to-r from-gray-300 to-gray-400', 'bg-[var(--neu-dark)]'],

  // Soft tinted gradient panels -> semantic soft tints
  ['bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-gradient-to-r from-violet-50 via-white to-purple-50 dark:from-violet-900/20', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-gradient-to-br from-blue-100 to-violet-100', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-gradient-to-r from-amber-50/30 dark:from-amber-500/5', 'bg-[var(--neu-warn-soft)]'],
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
console.log('DONE');
