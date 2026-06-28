const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const htmlFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.html'));

const links = [
  { href: 'index.html', icon: '🏠', text: 'Dashboard' },
  { href: 'bookings.html', icon: '📝', text: 'Rental Bookings' },
  { href: 'return-form.html', icon: '📦', text: 'Return Form' },
  { href: 'analytics.html', icon: '📊', text: 'Analytics' },
  { href: 'kyc.html', icon: '📋', text: 'KYC' },
  { href: 'logistics.html', icon: '🚚', text: 'Logistics' },
  { href: 'maintenance.html', icon: '🔧', text: 'Maintenance' },
  { href: 'qr-scan.html', icon: '📷', text: 'QR Scan' },
  { href: 'admin.html', icon: '⚙️', text: 'Admin', adminOnly: true },
  { href: 'audit.html', icon: '📋', text: 'Audit', adminOnly: true }
];

htmlFiles.forEach(file => {
  if (file === 'login.html') return; // no sidebar on login page

  let content = fs.readFileSync(path.join(DIR, file), 'utf8');

  // Build new nav-links
  let navHtml = '  <div class="nav-links">\n';
  links.forEach(l => {
    let cls = 'nav-link';
    if (l.adminOnly) cls += ' admin-only';
    if (l.href === file) cls += ' active'; // highlight current page
    let style = l.adminOnly ? ' style="display:none"' : '';
    navHtml += `    <a class="${cls}" href="${l.href}"${style}>${l.icon} ${l.text}</a>\n`;
  });
  navHtml += '  </div>';

  const footerHtml = `  <div class="sidebar-footer">
    <button class="theme-toggle-btn" onclick="toggleTheme()">🌓 Toggle Theme</button>
    <button class="btn-logout" onclick="doLogout()">🚪 Logout</button>
  </div>`;

  // We need to replace everything from <div class="nav-links"> up to </aside>
  // using Regex.
  const regex = /<div class="nav-links">[\s\S]*?<\/aside>/;
  if (regex.test(content)) {
    const replacement = `${navHtml}\n\n${footerHtml}\n</aside>`;
    content = content.replace(regex, replacement);
    fs.writeFileSync(path.join(DIR, file), content, 'utf8');
    console.log(`Updated sidebar in ${file}`);
  } else {
    console.log(`Sidebar not found in ${file}`);
  }
});

console.log('All sidebars updated successfully!');
