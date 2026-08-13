const fs = require('fs');
const path = require('path');

const FILES = [
  'src/app/dashboard/layout.js',
  'src/app/dashboard/live-exams/page.js',
  'src/app/dashboard/live-roster/page.js',
  'src/app/dashboard/practice/page.js',
  'src/app/dashboard/report/page.js',
  'src/app/dashboard/results/page.js',
  'src/app/dashboard/search/page.js',
  'src/app/login/page.js',
  'src/components/DeepDive/BatchDetailView.js',
  'src/components/DeepDive/SectionDetailView.js',
  'src/components/DeepDive/StudentDetailView.js',
  'src/components/DeepDive/TeacherDetailView.js',
  'src/components/DeepDive/CourseDetailView.js',
  'src/components/DeepDive/Skeletons.js',
  'src/components/DeepDive/ChangePasswordModal.js',
];

// ---------- 1. Backups ----------
const bakDir = '_neu_backups';
if (!fs.existsSync(bakDir)) fs.mkdirSync(bakDir);
for (const f of FILES) {
  const dest = path.join(bakDir, f.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(dest)) fs.copyFileSync(f, dest);
}

// ---------- 2. Extend token layer (semantic accents, badges, states) ----------
const css = `
/* ==== Neumorphism semantic extension (portal-wide) ==== */
:root {
  --neu-success: #3FA98E;      /* Active / Completed / high completion */
  --neu-success-soft: rgba(63, 169, 142, 0.14);
  --neu-achieve: #8B7FE8;      /* Exam / trophy / EXAM tags */
  --neu-achieve-soft: rgba(139, 127, 232, 0.14);
  --neu-warn: #D99A3D;         /* zero/low completion, pending */
  --neu-warn-soft: rgba(217, 154, 61, 0.16);
  --neu-danger: #D96C6C;
  --neu-danger-soft: rgba(217, 108, 108, 0.14);
  --neu-text: #2F3640;
  --neu-text-muted: #7A8494;
  --neu-divider: rgba(163, 177, 198, 0.35);
}
.dark {
  --neu-success: #4CC2A4;
  --neu-achieve: #9C91F0;
  --neu-warn: #E3AC55;
  --neu-danger: #E38787;
  --neu-text: #E5E9F0;
  --neu-text-muted: #8B95A7;
  --neu-divider: rgba(255, 255, 255, 0.06);
}

/* Shared badge system: one pill shape, semantic color */
.neu-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; box-shadow: var(--neu-shadow-tile); background: var(--neu-surface); }
.neu-badge-success { color: var(--neu-success); background: var(--neu-success-soft); box-shadow: none; }
.neu-badge-achieve { color: var(--neu-achieve); background: var(--neu-achieve-soft); box-shadow: none; }
.neu-badge-warn { color: var(--neu-warn); background: var(--neu-warn-soft); box-shadow: none; }
.neu-badge-danger { color: var(--neu-danger); background: var(--neu-danger-soft); box-shadow: none; }
.neu-badge-neutral { color: var(--neu-text-muted); }

/* Empty state */
.neu-empty-icon { display: flex; align-items: center; justify-content: center; border-radius: 9999px; background: var(--neu-surface); box-shadow: var(--neu-shadow-inset); color: var(--neu-text-muted); }

/* Skeleton pulse consistent with elevation */
.neu-skeleton { background: var(--neu-surface); box-shadow: var(--neu-shadow-tile); border-radius: 12px; animation: neuPulse 1.6s ease-in-out infinite; }
@keyframes neuPulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

/* Sidebar / topbar rail */
.neu-rail { background: var(--neu-bg); box-shadow: var(--neu-shadow-raised); }
.neu-rail-active { background: var(--neu-surface); box-shadow: var(--neu-shadow-inset); color: var(--neu-accent); }

/* Table helpers */
.neu-row-hover:hover { background: var(--neu-success-soft); }
.neu-section-row { background: var(--neu-achieve-soft); }
`;
let g = fs.readFileSync('src/app/globals.css', 'utf8');
if (!g.includes('Neumorphism semantic extension')) fs.appendFileSync('src/app/globals.css', css, 'utf8');

// ---------- 3. Global replacement table (string → string) ----------
const TABLE = [
  // Page backgrounds
  ['bg-slate-200 dark:bg-[#0B0F19]', 'neu-page'],
  ['bg-gray-50 dark:bg-[#0B0F19]', 'neu-page'],
  ['bg-gray-100 dark:bg-[#0B0F19]', 'neu-page'],

  // Raised surfaces
  ['bg-white dark:bg-slate-800/80', 'neu-raised'],
  ['bg-white dark:bg-slate-800', 'neu-raised'],
  ['bg-white dark:bg-slate-900', 'neu-raised'],
  ['bg-white dark:bg-white/5', 'neu-raised'],
  ['bg-white dark:bg-gray-800', 'neu-raised'],

  // Flat panels (large containers under cards)
  ['bg-gray-50 dark:bg-black/20', 'neu-flat'],
  ['bg-gray-50 dark:bg-black/10', 'neu-flat'],
  ['bg-gray-50 dark:bg-white/5', 'neu-inset'],
  ['bg-gray-100 dark:bg-white/5', 'neu-inset'],
  ['bg-gray-100 dark:bg-slate-700', 'neu-inset'],
  ['bg-gray-100 dark:bg-slate-800', 'neu-inset'],

  // Kill hard borders on cards; keep layout borders as soft dividers
  [' border border-gray-200 dark:border-white/10', ''],
  [' border border-gray-200 dark:border-white/5', ''],
  [' border border-gray-200 dark:border-slate-700/60', ''],
  [' border border-gray-200 dark:border-slate-700', ''],
  [' shadow-sm dark:shadow-none', ''],
  // Divider borders (border-t / border-b / border-r / border-l keep the class but re-color)
  ['border-gray-200 dark:border-white/5', 'border-[var(--neu-divider)]'],
  ['border-gray-200 dark:border-white/10', 'border-[var(--neu-divider)]'],
  ['border-gray-200 dark:border-slate-700/60', 'border-[var(--neu-divider)]'],
  ['border-gray-200 dark:border-slate-700', 'border-[var(--neu-divider)]'],
  ['divide-gray-200 dark:divide-white/5', 'divide-[var(--neu-divider)]'],
  ['divide-gray-100 dark:divide-white/5', 'divide-[var(--neu-divider)]'],
];

// Regex-based transforms (variable tails)
const REGEX_TABLE = [
  // Unify Export Report + other primary gradient CTAs → neu-btn-primary
  [/bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500[^"']*/g, 'neu-btn-primary'],
  [/bg-gradient-to-r from-cyan-600 to-blue-600[^"']*/g, 'neu-btn-primary'],
  // Emerald Export Report on student report → same primary
  [/bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500\/30/g, 'neu-btn-primary'],
  // Generic solid primary buttons
  [/bg-blue-600 hover:bg-blue-700 text-white/g, 'neu-btn-primary'],
  [/bg-blue-500 hover:bg-blue-600 text-white/g, 'neu-btn-primary'],
  [/bg-violet-600 hover:bg-violet-700 text-white/g, 'neu-btn-primary'],
  [/bg-cyan-600 hover:bg-cyan-700 text-white/g, 'neu-btn-primary'],
];

const report = {};
for (const f of FILES) {
  let c = fs.readFileSync(f, 'utf8');
  let n = 0;
  for (const [from, to] of TABLE) {
    const k = c.split(from).length - 1;
    if (k) { c = c.split(from).join(to); n += k; }
  }
  for (const [re, to] of REGEX_TABLE) {
    const k = (c.match(re) || []).length;
    if (k) { c = c.replace(re, to); n += k; }
  }
  fs.writeFileSync(f, c, 'utf8');
  report[f] = n;
}
console.log('Replacements per file:');
Object.entries(report).forEach(([f, n]) => console.log(`  ${n}\t${f}`));
console.log('DONE');
