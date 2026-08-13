const fs = require('fs');
const diff = fs.readFileSync('diff_page_utf8.txt', 'utf8');
const lines = diff.split('\n');
let insidePatch = false;
let spaceLines = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+++ b/src/app/dashboard/page.js')) {
        insidePatch = true;
        continue;
    }
    if (insidePatch && line.startsWith(' ')) {
        spaceLines++;
    }
}
console.log('Space lines: ' + spaceLines);
