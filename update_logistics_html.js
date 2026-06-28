const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'frontend', 'logistics.html');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Update devices fetch
const oldFetchDevices = `// Load devices
      const dres = await fetch('http://localhost:5000/api/analytics/top-devices', { headers:{'Authorization':\`Bearer \${token}\`} });
      // Fallback device list
      document.getElementById('f-device').innerHTML = '<option value="">— Select device —</option><option value="1">DEV-001 — Dell Laptop</option><option value="2">DEV-002 — Canon Camera</option><option value="3">DEV-003 — iPad Pro</option>';`;
const newFetchDevices = `// Load devices
      const dres = await fetch('http://localhost:5000/api/bookings/meta/devices', { headers:{'Authorization':\`Bearer \${token}\`} });
      const dj = await dres.json();
      if (dj.success) {
        document.getElementById('f-device').innerHTML = '<option value="">— Select device —</option>' + dj.data.map(d=>\`<option value="\${d.id}">\${d.device_name} — \${d.serial_number}</option>\`).join('');
      }`;
content = content.replace(oldFetchDevices, newFetchDevices);

// 2. Add Maps button to Kanban card
const oldKcTime = `<div class="kc-time">📅 \${fmtDate(r.scheduled_date)} \${r.scheduled_time?r.scheduled_time.slice(0,5):''}</div>`;
const newKcTime = `<div class="kc-time" style="margin-bottom:4px">📅 \${fmtDate(r.scheduled_date)} \${r.scheduled_time?r.scheduled_time.slice(0,5):''}</div>
          \${r.address?\`<div class="kc-address" style="font-size:12px;color:var(--text-3);margin-bottom:6px">📍 \${r.address} <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(r.address)}" target="_blank" style="color:var(--info);text-decoration:none;margin-left:4px;font-weight:600">Map ↗</a></div>\` : ''}`;
content = content.replace(oldKcTime, newKcTime);

// 3. Add Maps button to Table view
const oldTableAddr = `<td style="max-width:160px;font-size:12px;color:var(--text-2)">\${r.address||'—'}</td>`;
const newTableAddr = `<td style="max-width:160px;font-size:12px;color:var(--text-2)">
          \${r.address||'—'}
          \${r.address?\`<br><a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(r.address)}" target="_blank" style="color:var(--info);text-decoration:none;font-weight:600;display:inline-block;margin-top:4px">📍 Map ↗</a>\` : ''}
        </td>`;
content = content.replace(oldTableAddr, newTableAddr);

fs.writeFileSync(filepath, content);
console.log('Successfully updated logistics.html');
