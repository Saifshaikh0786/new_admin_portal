const fs = require('fs');

// Page identity: header gets a raised colorful icon chip; each page a distinct hue.
const EDITS = [
  {
    f: 'src/app/dashboard/practice/page.js',
    from: `<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Tracking</h1>
                    <p className="text-gray-500 dark:text-gray-400">Monitor student progress and scores across practice modules.</p>`,
    to: `<div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl neu-chip neu-chip-success flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6" /></div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Tracking</h1>
                            <p className="text-gray-500 dark:text-gray-400">Monitor student progress and scores across practice modules.</p>
                        </div>
                    </div>`,
  },
  {
    f: 'src/app/dashboard/results/page.js',
    from: `<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam & Proctoring Results</h1>`,
    to: `<div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl neu-chip neu-chip-accent flex items-center justify-center shrink-0"><Shield className="w-6 h-6" /></div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam & Proctoring Results</h1></div>`,
  },
  {
    f: 'src/app/dashboard/search/page.js',
    from: `<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Student Search</h1>`,
    to: `<div className="flex items-center justify-center gap-4 mb-4"><div className="w-14 h-14 rounded-2xl neu-chip neu-chip-info flex items-center justify-center shrink-0"><GraduationCap className="w-7 h-7" /></div><h1 className="text-4xl font-bold text-gray-900 dark:text-white">Student Search</h1></div>`,
  },
];

for (const e of EDITS) {
  let c = fs.readFileSync(e.f, 'utf8');
  // Normalize CRLF within the from-string comparison
  const fromCRLF = e.from.replace(/\n/g, '\r\n');
  if (c.includes(e.from)) { c = c.replace(e.from, e.to); }
  else if (c.includes(fromCRLF)) { c = c.replace(fromCRLF, e.to.replace(/\n/g, '\r\n')); }
  else { console.log('MISS', e.f); continue; }
  fs.writeFileSync(e.f, c, 'utf8');
  console.log('ok', e.f);
}
console.log('DONE');
