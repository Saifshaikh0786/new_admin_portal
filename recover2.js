const fs = require('fs');
const diff = fs.readFileSync('diff_page_utf8.txt', 'utf8');
const lines = diff.split('\n');
let insidePatch = false;
const out = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+++ b/src/app/dashboard/page.js')) {
        insidePatch = true;
        continue;
    }
    if (insidePatch) {
        if (line.startsWith('+')) {
            out.push(line.substring(1));
        } else if (line.startsWith(' ')) {
            out.push(line.substring(1));
        }
    }
}
fs.writeFileSync('src/app/dashboard/page.js', out.join('\n'));
