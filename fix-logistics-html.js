const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend', 'logistics.html');
let content = fs.readFileSync(file, 'utf8');

const regex = /<script>[\s\S]*?const API   = 'http:\/\/localhost:5000\/api\/logistics';[\s\S]*?<\/script>/;

const newScript = `<script>
  const API   = 'http://localhost:5000/api/logistics';
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) window.location.href = 'login.html';
  document.getElementById('user-name').textContent   = user?.name || '';
  document.getElementById('user-avatar').textContent = (user?.name||'?').charAt(0).toUpperCase();
  function doLogout() { localStorage.clear(); window.location.href = 'login.html'; }
  const H = () => ({ 'Content-Type':'application/json', 'Authorization':\`Bearer \${token}\` });

  let allRecords=[], editMode=false;

  document.addEventListener('DOMContentLoaded', () => { loadDropdowns(); loadLogistics(); document.getElementById('f-date').valueAsDate=new Date(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

  async function loadDropdowns() {
    try {
      const [cr, dr] = await Promise.all([
        fetch('http://localhost:5000/api/kyc/meta/customers', { headers: {'Authorization':\`Bearer \${token}\`} }),
        fetch('http://localhost:5000/api/bookings/devices', { headers: {'Authorization':\`Bearer \${token}\`} })
      ]);
      const cj = await cr.json();
      if (cj.success) {
        const csel = document.getElementById('f-customer');
        csel.innerHTML = '<option value="">— Select —</option>' + cj.data.map(c=>\`<option value="\${c.id}">\${c.name} — \${c.phone}</option>\`).join('');
      }
      const dj = await dr.json();
      if (dj.success) {
        document.getElementById('f-device').innerHTML = '<option value="">— Select device —</option>' + dj.data.map(d=>\`<option value="\${d.id}">\${d.device_name} — \${d.serial_number}</option>\`).join('');
      }
    } catch(e) {}
  }

  async function loadLogistics() {
    const type   = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;
    const params = new URLSearchParams();
    if (type)   params.set('type',   type);
    if (status) params.set('status', status);
    try {
      const res  = await fetch(\`\${API}?\${params}\`, { headers: {'Authorization':\`Bearer \${token}\`} });
      if (res.status===401) { doLogout(); return; }
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      allRecords = json.data;
      renderKanban(allRecords);
      renderTable(allRecords);
    } catch(err) {
      document.getElementById('table-body').innerHTML=\`<tr><td colspan="9"><div class="table-empty"><div class="icon">⚠️</div><p style="color:#dc2626">\${err.message}</p></div></td></tr>\`;
    }
  }

  function renderKanban(data) {
    const cols = { 'Scheduled':[], 'In Transit':[], 'Completed':[], 'Cancelled':[] };
    data.forEach(r => { if (cols[r.status]) cols[r.status].push(r); });
    const ids  = { 'Scheduled':'col-scheduled','In Transit':'col-transit','Completed':'col-completed','Cancelled':'col-cancelled' };
    const cnts = { 'Scheduled':'cnt-scheduled','In Transit':'cnt-transit','Completed':'cnt-completed','Cancelled':'cnt-cancelled' };
    Object.entries(cols).forEach(([status, items]) => {
      document.getElementById(cnts[status]).textContent = items.length;
      document.getElementById(ids[status]).innerHTML    = items.length ? items.map(r=>\`
        <div class="kanban-card" onclick="openEditModal(\${r.id})">
          <div class="kc-type \${r.type?.toLowerCase()}">\${r.type==='Delivery'?'🚚':'📦'} \${r.type}</div>
          <div class="kc-name">\${r.customer_name||'—'}</div>
          <div class="kc-device">\${r.device_name||'No device'}</div>
          <div class="kc-time" style="margin-bottom:4px">📅 \${fmtDate(r.scheduled_date)} \${r.scheduled_time?r.scheduled_time.slice(0,5):''}</div>
          \${r.address?\`<div class="kc-address" style="font-size:12px;color:var(--text-3);margin-bottom:6px">📍 \${r.address} <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(r.address)}" target="_blank" style="color:var(--info);text-decoration:none;margin-left:4px;font-weight:600">Map ↗</a></div>\` : ''}
          \${r.assigned_to?\`<span class="kc-assigned">👤 \${r.assigned_to}</span>\`:\`\`}
          <div class="kc-actions">
            \${status==='Scheduled'?\`<button class="btn btn-sm" style="background:#fff7ed;color:#92400e;border:1px solid #fde68a;font-size:10px" onclick="event.stopPropagation();updateStatus(\${r.id},'In Transit')">▶ Start</button>\`:\`\`}
            \${status==='In Transit'?\`<button class="btn btn-sm" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;font-size:10px" onclick="event.stopPropagation();updateStatus(\${r.id},'Completed')">✅ Done</button>\`:\`\`}
            <button class="btn btn-sm" style="background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;font-size:10px" onclick="event.stopPropagation();sendWhatsApp(\${r.id})">📱 WA</button>
          </div>
        </div>\`).join('') : \`<div style="text-align:center;padding:20px;color:var(--text-3);font-size:12px">No tasks</div>\`;
    });
  }

  function renderTable(data) {
    const tb = document.getElementById('table-body');
    if (!data.length) { tb.innerHTML=\`<tr><td colspan="9"><div class="table-empty"><div class="icon">🚚</div><p>No tasks found.</p></div></td></tr>\`; return; }
    const sc={'Scheduled':'badge-scheduled','In Transit':'badge-transit','Completed':'badge-completed','Cancelled':'badge-cancelled'};
    const tc={'Delivery':'badge-delivery','Pickup':'badge-pickup'};
    tb.innerHTML=data.map(r=>\`
      <tr>
        <td>#\${r.id}</td>
        <td><span class="badge \${tc[r.type]||''}">\${r.type==='Delivery'?'🚚':'📦'} \${r.type}</span></td>
        <td><span class="td-main">\${r.customer_name||'—'}</span><div class="td-sub">\${r.customer_phone||''}</div></td>
        <td><span class="td-main">\${r.device_name||'—'}</span><div class="td-sub">\${r.serial_number||''}</div></td>
        <td>\${fmtDate(r.scheduled_date)} \${r.scheduled_time?r.scheduled_time.slice(0,5):''}</td>
        <td style="max-width:160px;font-size:12px;color:var(--text-2)">
          \${r.address||'—'}
          \${r.address?\`<br><a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(r.address)}" target="_blank" style="color:var(--info);text-decoration:none;font-weight:600;display:inline-block;margin-top:4px">📍 Map ↗</a>\` : ''}
        </td>
        <td>\${r.assigned_to||'—'}</td>
        <td><span class="badge \${sc[r.status]||''}">\${r.status}</span></td>
        <td><div style="display:flex;gap:4px">
          <button class="btn btn-warning btn-sm" onclick="openEditModal(\${r.id})">✏️</button>
          <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsApp(\${r.id})">📱</button>
          \${r.status==='Scheduled'?\`<button class="btn btn-sm" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:4px 8px;font-size:11px" onclick="updateStatus(\${r.id},'In Transit')">▶</button>\`:\`\`}
          \${r.status==='In Transit'?\`<button class="btn btn-sm" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:4px 8px;font-size:11px" onclick="updateStatus(\${r.id},'Completed')">✅</button>\`:\`\`}
        </div></td>
      </tr>\`).join('');
  }

  function openAddModal() {
    editMode=false;
    document.getElementById('modal-title').textContent='Schedule Task';
    document.getElementById('submit-btn').textContent='Schedule Task';
    document.getElementById('edit-id').value='';
    resetForm();
    document.getElementById('form-modal').classList.add('open');
  }

  function openEditModal(id) {
    const r=allRecords.find(x=>x.id===id); if(!r) return;
    editMode=true;
    document.getElementById('modal-title').textContent=\`Edit Task #\${id}\`;
    document.getElementById('submit-btn').textContent='Update Task';
    document.getElementById('edit-id').value=id;
    document.querySelector(\`input[name="ltype"][value="\${r.type}"]\`).checked=true;
    document.getElementById('f-customer').value = r.customer_id||'';
    document.getElementById('f-date').value     = r.scheduled_date?.slice(0,10)||'';
    document.getElementById('f-time').value     = r.scheduled_time?.slice(0,5)||'';
    document.getElementById('f-address').value  = r.address||'';
    document.getElementById('f-assigned').value = r.assigned_to||'';
    document.getElementById('f-status').value   = r.status||'Scheduled';
    document.getElementById('f-notes').value    = r.notes||'';
    document.getElementById('form-modal').classList.add('open');
  }

  function closeModal(){document.getElementById('form-modal').classList.remove('open');resetForm();}
  function resetForm(){
    document.getElementById('type-delivery').checked=true;
    ['f-address','f-assigned','f-notes'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('f-customer').value='';document.getElementById('f-device').value='';
    document.getElementById('f-date').valueAsDate=new Date();document.getElementById('f-time').value='';
    document.getElementById('f-status').value='Scheduled';
    const b=document.getElementById('submit-btn');b.disabled=false;b.textContent='Schedule Task';
  }

  async function submitTask() {
    const type     = document.querySelector('input[name="ltype"]:checked').value;
    const customer = document.getElementById('f-customer').value;
    const date     = document.getElementById('f-date').value;
    const address  = document.getElementById('f-address').value.trim();
    if (!customer || !date) { showToast('Customer and date are required','error'); return; }
    const btn=document.getElementById('submit-btn'); btn.disabled=true; btn.textContent='Saving…';
    const payload={
      customer_id:    +customer,
      device_id:      +document.getElementById('f-device').value||null,
      type, scheduled_date:date,
      scheduled_time: document.getElementById('f-time').value||null,
      address:        address||null,
      assigned_to:    document.getElementById('f-assigned').value.trim()||null,
      status:         document.getElementById('f-status').value,
      notes:          document.getElementById('f-notes').value.trim()||null
    };
    try {
      const id=document.getElementById('edit-id').value;
      const res=await fetch(editMode?\`\${API}/\${id}\`:API,{method:editMode?'PUT':'POST',headers:H(),body:JSON.stringify(payload)});
      const json=await res.json(); if(!json.success) throw new Error(json.message);
      showToast(\`✅ Task \${editMode?'updated':'scheduled'}!\`,'success');
      closeModal(); loadLogistics();
    } catch(err){showToast(err.message,'error');btn.disabled=false;btn.textContent=editMode?'Update Task':'Schedule Task';}
  }

  async function updateStatus(id, status) {
    const r=allRecords.find(x=>x.id===id); if(!r) return;
    try {
      const res=await fetch(\`\${API}/\${id}\`,{method:'PUT',headers:H(),body:JSON.stringify({...r,status})});
      const json=await res.json(); if(!json.success) throw new Error(json.message);
      showToast(\`✅ Status updated to \${status}\`,'success'); loadLogistics();
    } catch(err){ showToast(err.message,'error'); }
  }

  async function sendWhatsApp(id) {
    const r=allRecords.find(x=>x.id===id); if(!r) return;
    const msg=\`📦 *One Point Solutions — \${r.type} Update*\\n\\nDear \${r.customer_name},\\n\\nYour \${r.type.toLowerCase()} is scheduled:\\n📅 Date: \${fmtDate(r.scheduled_date)}\\n⏰ Time: \${r.scheduled_time?.slice(0,5)||'TBD'}\\n📍 Address: \${r.address||'TBD'}\\n👤 Staff: \${r.assigned_to||'TBD'}\\n\\nFor queries call us. Team One Point Solutions\`;
    const phone=r.customer_phone?.replace(/\\D/g,'');
    if (!phone) { showToast('No phone number for this customer','error'); return; }
    window.open(\`https://wa.me/91\${phone}?text=\${encodeURIComponent(msg)}\`, '_blank');
    showToast('📱 WhatsApp opened!','success');
  }

  const fmtDate=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
  function showToast(msg,type='success'){const t=document.getElementById('toast');t.textContent=msg;t.className=\`show \${type}\`;setTimeout(()=>{t.className='';},3500);}
</script>`;

content = content.replace(regex, newScript);
fs.writeFileSync(file, content);
console.log('Fixed logistics.html completely');
