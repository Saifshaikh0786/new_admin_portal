const fs = require('fs');
const FILES = [
  'src/app/dashboard/practice/page.js',
  'src/app/dashboard/results/page.js',
  'src/app/dashboard/search/page.js',
  'src/app/dashboard/live-roster/page.js',
  'src/app/dashboard/live-exams/page.js',
  'src/app/dashboard/report/page.js',
  'src/app/login/page.js',
  'src/components/DeepDive/TeacherDetailView.js',
  'src/components/DeepDive/CourseDetailView.js',
  'src/components/DeepDive/StudentDetailView.js',
  'src/components/DeepDive/SectionDetailView.js',
];

const TABLE = [
  // Kill leftover hard frames that fight the soft shadows
  [' border-2 border-[var(--neu-divider)]', ''],
  [' border-2 border-gray-100 dark:border-slate-700', ''],
  [' border border-gray-100 dark:border-slate-700', ''],
  [' border border-gray-100 dark:border-slate-700/50', ''],
  [' border border-slate-200 dark:border-slate-700', ''],
  [' border border-[var(--neu-divider)] rounded-2xl shadow-sm', ' rounded-2xl'],
  [' shadow-sm relative overflow', ' relative overflow'],

  // Old stat-card accent bars -> colored neu chips handled below; drop the bars
  ['card p-5 border-l-4 border-l-blue-500 flex flex-col justify-center neu-raised', 'p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[#4A9BD9]'],
  ['card p-5 border-l-4 border-l-indigo-500 flex flex-col justify-center neu-raised', 'p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-accent)]'],
  ['card p-5 border-l-4 border-l-amber-500 flex flex-col justify-center neu-raised', 'p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-warn)]'],
  ['card p-5 border-l-4 border-l-purple-500 flex flex-col justify-center neu-raised', 'p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-achieve)]'],
  ['card p-5 border-l-4 border-l-emerald-500 flex flex-col justify-center neu-raised', 'p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-success)]'],

  // Inputs: raised -> inset (pressed-in field is the soft-UI input pattern)
  ['text-sm neu-raised rounded-full', 'text-sm neu-inset rounded-full'],
  ['neu-raised rounded-2xl pl-14', 'neu-inset rounded-2xl pl-14'],
  ['py-2.5 neu-raised', 'py-2.5 neu-inset'],

  // Login page slate inputs -> inset on neu surface
  ['bg-slate-50 dark:bg-slate-900/50', 'neu-inset'],
  ['bg-blue-600 hover:bg-blue-500 text-white', 'neu-btn-primary'],
  [' border border-blue-500 rounded-xl', ' rounded-xl neu-tile text-[var(--neu-accent)]'],

  // glass-panel remnants -> raised
  ['glass-panel overflow-hidden', 'neu-raised overflow-hidden'],
  ['glass-panel', 'neu-raised'],

  // Search page: big avatar gradient -> accent chip, result rows hover
  ['bg-gradient-to-br from-blue-500 to-violet-600', 'neu-chip neu-chip-accent'],
  ['hover:bg-gray-50 dark:hover:bg-slate-700 tr', 'neu-hover tr'],
  ['bg-gray-50 dark:bg-slate-800/50 rounded-xl', 'neu-inset rounded-xl'],

  // Error panels -> danger soft token
  ['bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50', 'bg-[var(--neu-danger-soft)]'],
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
