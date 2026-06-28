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

const initScript = `
  <script>
    (function() {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  </script>
</head>`;

const toggleScript = `
<script>
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', newTheme);
  }
</script>
</body>`;

const toggleBtn = `<button class="theme-toggle-btn" onclick="toggleTheme()">🌓 Toggle Theme</button>\n    <button class="btn-logout"`;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Inject Init Script into <head> if not already there
  if (!content.includes('localStorage.getItem(\'theme\')')) {
    content = content.replace('</head>', initScript);
  }

  // 2. Inject Toggle Function before </body> if not already there
  if (!content.includes('function toggleTheme()')) {
    content = content.replace('</body>', toggleScript);
  }

  // 3. Inject Button in sidebar (except for login.html)
  if (file !== 'login.html' && !content.includes('theme-toggle-btn')) {
    content = content.replace('<button class="btn-logout"', toggleBtn);
  }

  // Special case for login.html button injection
  if (file === 'login.html' && !content.includes('theme-toggle-btn')) {
    const loginFooter = '<div class="footer-link">';
    const loginToggleBtn = `<button class="theme-toggle-btn" style="margin-top:20px; width:100%; border:1px solid var(--border); padding:10px; background:var(--surface); color:var(--text-1); border-radius:var(--radius-sm); cursor:pointer;" onclick="toggleTheme()">🌓 Toggle Theme</button>\n    <div class="footer-link">`;
    content = content.replace(loginFooter, loginToggleBtn);
  }

  fs.writeFileSync(filePath, content);
  console.log('Processed theme injection for ' + file);
});
