const fs = require('fs');
const FILES = [
  'src/components/DeepDive/BatchDetailView.js',
  'src/components/DeepDive/SectionDetailView.js',
  'src/components/DeepDive/StudentDetailView.js',
  'src/components/DeepDive/TeacherDetailView.js',
  'src/components/DeepDive/CourseDetailView.js',
  'src/app/dashboard/live-exams/page.js',
  'src/app/dashboard/live-roster/page.js',
  'src/app/dashboard/practice/page.js',
  'src/app/dashboard/report/page.js',
  'src/app/dashboard/results/page.js',
  'src/app/dashboard/search/page.js',
];

// Soft badge/pill fills -> semantic soft tokens; text colors -> semantic text tokens.
const TABLE = [
  // Success (Active / Completed / registered)
  ['bg-emerald-500/10', 'bg-[var(--neu-success-soft)]'],
  ['bg-emerald-500/20', 'bg-[var(--neu-success-soft)]'],
  ['bg-emerald-100', 'bg-[var(--neu-success-soft)]'],
  ['bg-emerald-50', 'bg-[var(--neu-success-soft)]'],
  ['text-emerald-600', 'text-[var(--neu-success)]'],
  ['text-emerald-500', 'text-[var(--neu-success)]'],
  ['dark:text-emerald-400', 'dark:text-[var(--neu-success)]'],

  // Achievement (EXAM / trophy / violet)
  ['bg-violet-500/10', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-violet-500/20', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-violet-100', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-violet-50', 'bg-[var(--neu-achieve-soft)]'],
  ['text-violet-600', 'text-[var(--neu-achieve)]'],
  ['text-violet-500', 'text-[var(--neu-achieve)]'],
  ['dark:text-violet-400', 'dark:text-[var(--neu-achieve)]'],

  // Attention (pending / 0% / amber-yellow)
  ['bg-yellow-500/20', 'bg-[var(--neu-warn-soft)]'],
  ['bg-yellow-100', 'bg-[var(--neu-warn-soft)]'],
  ['bg-amber-500/10', 'bg-[var(--neu-warn-soft)]'],
  ['bg-amber-100', 'bg-[var(--neu-warn-soft)]'],
  ['text-amber-600', 'text-[var(--neu-warn)]'],
  ['dark:text-amber-400', 'dark:text-[var(--neu-warn)]'],

  // Danger
  ['bg-red-500/10', 'bg-[var(--neu-danger-soft)]'],
  ['bg-red-500/20', 'bg-[var(--neu-danger-soft)]'],
  ['bg-red-100', 'bg-[var(--neu-danger-soft)]'],
  ['text-red-600', 'text-[var(--neu-danger)]'],
  ['dark:text-red-400', 'dark:text-[var(--neu-danger)]'],

  // Blue informational chips -> brand accent family
  ['bg-blue-500/10', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-blue-500/20', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-blue-100', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-blue-50', 'bg-[var(--neu-achieve-soft)]'],
  ['bg-cyan-500/10', 'bg-[var(--neu-achieve-soft)]'],
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
