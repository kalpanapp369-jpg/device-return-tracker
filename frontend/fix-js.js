const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const htmlFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.html') && f !== 'login.html');

const replacementJs = `  if (!token || !user) window.location.href = 'login.html';
  const unameEl = document.getElementById('user-name');
  if (unameEl) unameEl.textContent = user?.name || '';
  const uavatarEl = document.getElementById('user-avatar');
  if (uavatarEl) uavatarEl.textContent = (user?.name||'?').charAt(0).toUpperCase();
  if (user?.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }`;

htmlFiles.forEach(file => {
  let content = fs.readFileSync(path.join(DIR, file), 'utf8');

  // Look for something like:
  // document.getElementById('user-name').textContent = user?.name || '';
  // Or:
  // document.getElementById('user-name').textContent   = user?.name || '';
  // Or even blocks that already contain user-avatar logic.
  
  // To be safe, we can look for the token check block. Usually it's:
  // if (!token) window.location.href = 'login.html';
  // document.getElementById('user-name').textContent = user?.name || '';
  
  const rgx1 = /if\s*\(!token\)\s*window\.location\.href\s*=\s*'login\.html';\s*document\.getElementById\('user-name'\)\.textContent\s*=\s*user\?\.name\s*\|\|\s*'';/g;
  
  const rgx2 = /if\s*\(!token\s*\|\|\s*!user\)\s*window\.location\.href\s*=\s*'login\.html';\s*document\.getElementById\('user-name'\)\.textContent\s*=\s*user\?\.name\s*\|\|\s*'';\s*document\.getElementById\('user-avatar'\)\.textContent\s*=\s*\(user\?\.name\|\|'\?'\)\.charAt\(0\)\.toUpperCase\(\);(\s*if\s*\(user\?\.role\s*===\s*'admin'\)\s*\{\s*document\.querySelectorAll\('\.admin-only'\)\.forEach\(el\s*=>\s*el\.style\.display\s*=\s*''\);\s*\})?/g;

  if (rgx2.test(content)) {
    content = content.replace(rgx2, replacementJs);
    fs.writeFileSync(path.join(DIR, file), content, 'utf8');
    console.log(`Updated JS logic in ${file} (rgx2)`);
  } else if (rgx1.test(content)) {
    content = content.replace(rgx1, replacementJs);
    fs.writeFileSync(path.join(DIR, file), content, 'utf8');
    console.log(`Updated JS logic in ${file} (rgx1)`);
  } else {
    console.log(`Could not find target JS block in ${file}`);
  }
});

console.log('All JS logic updated successfully!');
