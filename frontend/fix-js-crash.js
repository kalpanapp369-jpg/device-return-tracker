const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'analytics.html',
  'kyc.html',
  'logistics.html',
  'maintenance.html',
  'admin.html',
  'audit.html',
  'qr-scan.html',
  'detail.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix the JS error that crashes the page
  const oldJs = `const rb = document.getElementById('role-badge');
  rb.textContent = user?.role || '';
  rb.className   = \`role-badge role-\${user?.role||'staff'}\`;`;
  
  const newJs = `const rb = document.getElementById('user-role') || document.getElementById('role-badge');
  if (rb) {
    rb.textContent = user?.role || '';
    rb.className   = \`role-badge role-\${user?.role||'staff'}\`;
  }`;

  if (content.includes("document.getElementById('role-badge')")) {
    content = content.replace(oldJs, newJs);
    
    // Some files might have slightly different spacing, so use regex if standard string replace fails
    if (!content.includes("document.getElementById('user-role') ||")) {
      content = content.replace(/const rb = document\.getElementById\('role-badge'\);[\s\S]*?rb\.className\s*=\s*`role-badge role-\$\{user\?\.role\|\|'staff'\}`;/, newJs);
    }

    fs.writeFileSync(filePath, content);
    console.log('Fixed JS error in ' + file);
  }
});
