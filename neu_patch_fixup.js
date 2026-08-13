const fs = require('fs');
const glob = ['src/app/dashboard/page.js','src/app/dashboard/live-exams/page.js','src/app/dashboard/live-roster/page.js','src/app/dashboard/practice/page.js','src/app/dashboard/report/page.js','src/app/dashboard/results/page.js','src/app/dashboard/search/page.js','src/app/login/page.js','src/components/DeepDive/BatchDetailView.js','src/components/DeepDive/SectionDetailView.js','src/components/DeepDive/StudentDetailView.js','src/components/DeepDive/TeacherDetailView.js','src/components/DeepDive/CourseDetailView.js','src/components/DeepDive/Skeletons.js','src/components/DeepDive/ChangePasswordModal.js'];

for (const f of glob) {
  let c = fs.readFileSync(f, 'utf8');
  const before = c;
  // e.g. bg-[var(--neu-achieve-soft)]0, bg-[var(--neu-achieve-soft)]0/30, bg-[var(--neu-success-soft)]/50
  c = c.replace(/((?:bg|text|border|ring|from|to)-\[var\(--neu-[\w-]+\)\])\d*(?:\/\d+)?/g, '$1');
  if (c !== before) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('fixed', f);
  }
}
console.log('DONE');
