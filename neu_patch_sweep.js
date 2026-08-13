const fs = require('fs');
const FILES = [
  'src/app/dashboard/live-exams/page.js',
  'src/app/dashboard/live-roster/page.js',
  'src/app/dashboard/practice/page.js',
  'src/app/dashboard/report/page.js',
  'src/app/dashboard/results/page.js',
  'src/app/dashboard/search/page.js',
  'src/app/login/page.js',
  'src/components/DeepDive/Skeletons.js',
];
const TABLE = [
  ['bg-white dark:bg-slate-950', 'neu-raised'],
  ['bg-white dark:bg-slate-900/50', 'neu-raised'],
  ['bg-white dark:bg-slate-800/50', 'neu-raised'],
  ['bg-white dark:bg-white/5', 'neu-raised'],
  ['border-gray-200 dark:border-gray-700', 'border-[var(--neu-divider)]'],
  ['border-gray-200 dark:border-gray-800', 'border-[var(--neu-divider)]'],
  ['border-gray-200 dark:border-white/20', 'border-[var(--neu-divider)]'],
  // Skeletons -> token pulse
  ['animate-pulse bg-gray-200/80 dark:bg-[var(--card)]/5', 'neu-skeleton'],
  ['bg-gray-50 dark:bg-[var(--card)]/5 animate-pulse', 'neu-skeleton'],
];
for (const f of FILES) {
  let c = fs.readFileSync(f, 'utf8');
  let n = 0;
  // find remaining unmatched patterns to report
  for (const [from, to] of TABLE) { const k = c.split(from).length - 1; if (k) { c = c.split(from).join(to); n += k; } }
  const left = c.match(/bg-white dark:bg-[\w/[\]#-]+|border-gray-200 dark:border-[\w/[\]#-]+/g);
  fs.writeFileSync(f, c, 'utf8');
  console.log(f, '=> fixed', n, 'left:', left ? left.join(' | ') : 'none');
}
