const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'frontend/detail.html');

let html = fs.readFileSync(p, 'utf8');
html = html.replace(/\\`/g, '`');
html = html.replace(/\\\${/g, '${');

fs.writeFileSync(p, html);
console.log('Fixed detail.html syntax errors!');
