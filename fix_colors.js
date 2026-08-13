const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/batch-analytics/student-view/page.js', 'utf8');

// Replace tab styles
content = content.replace(
  /flex items-center gap-1\.5 px-3 py-1\.5 rounded-lg text-\[12px\] font-semibold border transition-all duration-200 \$\{/g,
  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold border transition-all duration-200 ${'
);
content = content.replace(
  /'text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700\/50'/g,
  "'text-slate-600 dark:text-slate-400 border-transparent bg-slate-50 hover:bg-slate-100 dark:bg-gray-800/50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'"
);

// Replace headers
content = content.replace(/text-\[14px\] font-bold mb-3/g, 'text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3');
content = content.replace(/text-\[14px\] font-bold mb-1/g, 'text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-1');
content = content.replace(/text-\[13px\] font-bold text-gray-700/g, 'text-[14px] font-extrabold text-slate-800 dark:text-slate-100');
content = content.replace(/text-\[13px\] font-bold text-gray-900/g, 'text-[14px] font-extrabold text-slate-800 dark:text-slate-100');
content = content.replace(/text-\[12px\] font-bold text-gray-700/g, 'text-[13px] font-extrabold text-slate-800 dark:text-slate-100');

// Replace some sub-texts for better contrast
content = content.replace(/text-\[11px\] text-gray-500/g, 'text-[11px] text-slate-600 dark:text-slate-400 font-medium');
content = content.replace(/text-\[10px\] text-gray-500/g, 'text-[10px] text-slate-600 dark:text-slate-400 font-medium');
content = content.replace(/text-\[9px\] text-gray-500/g, 'text-[9px] text-slate-600 dark:text-slate-400 font-medium');
content = content.replace(/text-\[8px\] text-gray-500/g, 'text-[9px] text-slate-500 dark:text-slate-400 font-medium');

// Also update the cards in Overview
content = content.replace(/text-\[10px\] text-gray-400/g, 'text-[10px] text-slate-500 dark:text-slate-400 font-medium');

fs.writeFileSync('src/app/dashboard/batch-analytics/student-view/page.js', content);
console.log('Replacements made.');
