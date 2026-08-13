const fs = require('fs');

// ---------- 1. Backup ----------
fs.copyFileSync('src/app/dashboard/page.js', 'src/app/dashboard/page.PRE_NEU.js');

// ---------- 2. Append token layer to globals.css ----------
const css = `
/* ============================================================
   Neumorphism token layer — Dashboard route only
   All dashboard soft-UI colors/shadows/radii live here.
   ============================================================ */
:root {
  --neu-bg: #E9EDF4;
  --neu-surface: #E9EDF4;
  --neu-light: rgba(255, 255, 255, 0.95);
  --neu-dark: rgba(163, 177, 198, 0.55);
  --neu-accent: #7C6FDB;
  --neu-accent-strong: #6A5BD4;
  --neu-shadow-raised: 6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light);
  --neu-shadow-raised-lg: 9px 9px 22px var(--neu-dark), -9px -9px 22px var(--neu-light);
  --neu-shadow-inset: inset 4px 4px 9px var(--neu-dark), inset -4px -4px 9px var(--neu-light);
  --neu-shadow-tile: 3px 3px 7px var(--neu-dark), -3px -3px 7px var(--neu-light);
  --neu-shadow-accent: 4px 4px 10px rgba(124, 111, 219, 0.35), -3px -3px 8px var(--neu-light);
}
.dark {
  --neu-bg: #0B0F19;
  --neu-surface: #151B2B;
  --neu-light: rgba(255, 255, 255, 0.045);
  --neu-dark: rgba(0, 0, 0, 0.65);
  --neu-accent: #8B7FE8;
  --neu-accent-strong: #7C6FDB;
  --neu-shadow-accent: 4px 4px 12px rgba(0, 0, 0, 0.55), -3px -3px 8px var(--neu-light);
}

/* Elevation states */
.neu-page { background: var(--neu-bg); }
.neu-raised { background: var(--neu-surface); box-shadow: var(--neu-shadow-raised); }
.neu-hover { transition: box-shadow 0.3s ease, transform 0.3s ease; }
.neu-hover:hover { box-shadow: var(--neu-shadow-raised-lg); }
.neu-inset { background: var(--neu-surface); box-shadow: var(--neu-shadow-inset); }
.neu-flat { background: var(--neu-surface); box-shadow: none; }
.neu-tile { background: var(--neu-surface); box-shadow: var(--neu-shadow-tile); }

/* Accent */
.neu-accent-text { color: var(--neu-accent); }

/* Buttons */
.neu-btn-primary { background: var(--neu-accent); color: #ffffff; box-shadow: var(--neu-shadow-accent); transition: all 0.2s ease; }
.neu-btn-primary:hover { background: var(--neu-accent-strong); }
.neu-btn-primary:active { box-shadow: var(--neu-shadow-inset); transform: scale(0.98); }
.neu-btn-secondary { background: var(--neu-surface); color: #6b7280; box-shadow: var(--neu-shadow-tile); }
.dark .neu-btn-secondary { color: #cbd5e1; }
.neu-btn-secondary:hover { box-shadow: var(--neu-shadow-raised); }
.neu-btn-secondary:active { box-shadow: var(--neu-shadow-inset); }

/* Keyboard focus — real ring, not shadow-only */
.neu-page :where(button, input, a, [tabindex]):focus-visible {
  outline: 2px solid var(--neu-accent);
  outline-offset: 2px;
}
`;
if (!fs.readFileSync('src/app/globals.css', 'utf8').includes('Neumorphism token layer')) {
  fs.appendFileSync('src/app/globals.css', css, 'utf8');
}

// ---------- 3. className-only swaps in page.js ----------
let p = fs.readFileSync('src/app/dashboard/page.js', 'utf8');
const R = [];
function rep(from, to) {
  const count = p.split(from).length - 1;
  p = p.split(from).join(to);
  R.push([count, from.slice(0, 60), to.slice(0, 40)]);
}

// Page background
rep('bg-[#FAF8F5] dark:bg-[#0B0F19]', 'neu-page');

// Search input -> inset groove (before generic surface swap)
rep('bg-white dark:bg-slate-800/80 border border-[#E7ECF4] dark:border-slate-700 rounded-[14px]', 'neu-inset rounded-[14px]');
rep(' shadow-[inset_0_2px_4px_rgba(15,23,42,0.03),0_2px_6px_rgba(15,23,42,0.04)]', '');

// Surfaces -> raised
rep('bg-white dark:bg-slate-800/80', 'neu-raised');
rep('bg-white dark:bg-slate-800 ', 'neu-raised ');

// Kill hard borders (separation comes from shadow now)
rep(' border border-[#E7ECF4] dark:border-slate-700/60', '');
rep(' border border-[#E7ECF4] dark:border-slate-700', '');

// Old drop shadows -> token shadows
rep(' shadow-[0_10px_25px_rgba(15,23,42,0.05)]', '');
rep('hover:shadow-[0_20px_40px_rgba(15,23,42,0.09)]', 'neu-hover');
rep(' shadow-[0_2px_6px_rgba(15,23,42,0.04)]', '');
rep(' shadow-[0_20px_40px_rgba(15,23,42,0.14)]', '');

// Icon-tile pseudo shadows -> neu-tile handles it
rep(' shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(124,58,237,0.10)]', '');
rep(' shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(16,185,129,0.10)]', '');
rep(' shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(245,158,11,0.10)]', '');
rep(' shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(124,58,237,0.08)]', '');

// Pastel icon tiles -> neutral raised tiles
rep('bg-[#F1EAFB] dark:bg-violet-500/15', 'neu-tile');
rep('bg-[#E6F6F1] dark:bg-emerald-500/15', 'neu-tile');
rep('bg-[#FDF1E7] dark:bg-amber-500/15', 'neu-tile');

// Hero quick-stat tiles + soft chips -> inset
rep('bg-[#F1EAFB] dark:bg-violet-500/10 rounded-2xl', 'neu-inset rounded-2xl');
rep('bg-[#E6F6F1] dark:bg-emerald-500/10 rounded-2xl', 'neu-inset rounded-2xl');
rep('bg-[#FDF1E7] dark:bg-amber-500/10 rounded-2xl', 'neu-inset rounded-2xl');
rep('bg-[#F1EAFB] dark:bg-violet-500/10', 'neu-inset');

// Inner stat blocks / neutral chips -> inset grooves
rep('bg-[#F6F4F0] dark:bg-slate-700/40', 'neu-inset');
rep('bg-[#F1F5F9] dark:bg-slate-700/60', 'neu-inset');

// Primary actions -> accent raised, inset on press (do long strings first)
rep('bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold shadow-[0_6px_14px_rgba(124,58,237,0.25)] active:scale-[0.98] transition-all', 'neu-btn-primary text-sm font-semibold');
rep('bg-[#7C3AED] text-white shadow-[0_6px_14px_rgba(124,58,237,0.30)]', 'neu-btn-primary');

// Secondary buttons
rep('bg-[#F1F5F9] dark:bg-slate-700 text-sm font-semibold text-[#6B7280] dark:text-gray-300 hover:bg-[#E7ECF4] dark:hover:bg-slate-600 transition-colors', 'neu-btn-secondary text-sm font-semibold transition-colors');
rep('bg-[#F1F5F9] dark:bg-slate-700 text-[#94A3B8] dark:text-gray-400', 'neu-inset text-[#94A3B8] dark:text-gray-400');

// Accent unification (single accent family instead of violet+amber mix)
rep('group-hover:text-[#7C3AED] dark:group-hover:text-blue-400', 'group-hover:text-[var(--neu-accent)]');
rep('group-hover:text-[#F59E0B] dark:group-hover:text-amber-400', 'group-hover:text-[var(--neu-accent)]');
rep('group-hover:text-[#10B981] dark:group-hover:text-emerald-400', 'group-hover:text-[var(--neu-accent)]');
rep('text-[#7C3AED] dark:text-violet-400', 'neu-accent-text');
rep('text-[#F59E0B] dark:text-amber-400', 'neu-accent-text');
rep('group-hover:text-[#10B981] ', 'group-hover:text-[var(--neu-accent)] ');
rep('group-hover:text-[#F59E0B] ', 'group-hover:text-[var(--neu-accent)] ');
rep('text-[#7C3AED]', 'neu-accent-text');

fs.writeFileSync('src/app/dashboard/page.js', p, 'utf8');
console.log('Replacements applied:');
R.forEach(([c, f]) => console.log(`  ${c}x  ${f}`));
console.log('DONE');
