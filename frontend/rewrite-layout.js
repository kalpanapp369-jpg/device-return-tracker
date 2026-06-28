const fs = require('fs');
const path = require('path');

const files = [
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

  // Find the topnav block
  const navStart = content.indexOf('<nav class="topnav">');
  const navEnd = content.indexOf('</nav>') + 6;
  
  if (navStart !== -1 && navEnd !== -1) {
    const pageName = file.replace('.html', '');
    const sidebarHtml = `<!-- SIDEBAR -->
<aside class="sidebar">
  <a class="brand" href="index.html">
    <div class="brand-icon">📦</div>
    Device Returns
  </a>
  
  <div class="user-chip">
    <div class="avatar" id="user-avatar">?</div>
    <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;" id="user-name">…</div>
  </div>

  <div class="nav-links">
    <a class="nav-link \${pageName === 'index' ? 'active' : ''}" href="index.html">🏠 Dashboard</a>
    <a class="nav-link \${pageName === 'analytics' ? 'active' : ''}" href="analytics.html">📊 Analytics</a>
    <a class="nav-link \${pageName === 'kyc' ? 'active' : ''}" href="kyc.html">📋 KYC</a>
    <a class="nav-link \${pageName === 'logistics' ? 'active' : ''}" href="logistics.html">🚚 Logistics</a>
    <a class="nav-link \${pageName === 'maintenance' ? 'active' : ''}" href="maintenance.html">🔧 Maintenance</a>
    <a class="nav-link \${pageName === 'qr-scan' ? 'active' : ''}" href="qr-scan.html">📷 QR Scan</a>
    <a class="nav-link admin-only \${pageName === 'admin' ? 'active' : ''}" href="admin.html" style="display:none">⚙️ Admin</a>
    <a class="nav-link admin-only \${pageName === 'audit' ? 'active' : ''}" href="audit.html" style="display:none">📋 Audit</a>
  </div>

  <div class="sidebar-footer">
    <button class="btn-logout" onclick="doLogout()">← Logout</button>
  </div>
</aside>

<!-- MAIN CONTENT -->
<main class="main-content">`;

    content = content.substring(0, navStart) + sidebarHtml + content.substring(navEnd);
  }

  // Replace <div class="page"...> with <div class="page-inner"...> to avoid layout conflicts,
  // or simply remove the width constraints if possible.
  content = content.replace(/<div class="page"/g, '<div class="page-inner"');
  
  // Close the main tag before the scripts
  const scriptIndex = content.lastIndexOf('<script>');
  if (scriptIndex !== -1) {
    content = content.substring(0, scriptIndex) + '</main>\n' + content.substring(scriptIndex);
  } else {
    // If no script, just add it before body close
    const bodyIndex = content.lastIndexOf('</body>');
    if (bodyIndex !== -1) {
      content = content.substring(0, bodyIndex) + '</main>\n' + content.substring(bodyIndex);
    }
  }

  // Remove the old <style> blocks in these pages to let style.css take over fully
  // We'll strip inline <style>...</style> completely
  content = content.replace(/<style>[\s\S]*?<\/style>/g, '');
  
  // Add Outfit font link if not present
  if (!content.includes('fonts.googleapis.com')) {
    content = content.replace('</head>', `  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">\n</head>`);
  }

  fs.writeFileSync(filePath, content);
  console.log('Updated ' + file);
});
