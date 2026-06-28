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
  'detail.html',
  'login.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if style.css is linked
  if (!content.includes('href="style.css"')) {
    content = content.replace('</head>', '  <link rel="stylesheet" href="style.css"/>\n</head>');
    fs.writeFileSync(filePath, content);
    console.log('Added style.css to ' + file);
  } else {
    console.log('style.css already in ' + file);
  }
});
