const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'frontend', 'kyc.html');
let content = fs.readFileSync(filepath, 'utf8');

const brokenIndex = content.indexOf("document.getElementById('f-deposit-paid').checked= r.deposit_paid    || false;");
const endIndex = content.indexOf("const fmt = n => parseFloat(n||0).toFixed(2);");

if (brokenIndex !== -1 && endIndex !== -1) {
  const correctCode = `document.getElementById('f-deposit-paid').checked= r.deposit_paid    || false;
    document.getElementById('f-notes').value      = r.notes       || '';
    document.getElementById('form-modal').classList.add('open');
  }

  function closeModal() { document.getElementById('form-modal').classList.remove('open'); resetForm(); }
  function resetForm() {
    ['f-idnum','f-address','f-deposit','f-notes'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('f-customer').value=''; document.getElementById('f-idtype').value='';
    document.getElementById('f-kyc-status').value='Pending';
    document.getElementById('f-agreement').checked=false; document.getElementById('f-deposit-paid').checked=false;
    const btn=document.getElementById('submit-btn'); btn.disabled=false; btn.textContent='Save KYC Record';
  }

  async function submitKYC() {
    const customer_id = document.getElementById('f-customer').value;
    const id_type     = document.getElementById('f-idtype').value;
    const id_number   = document.getElementById('f-idnum').value.trim();
    if (!id_type || !id_number) { showToast('ID Type and ID Number are required','error'); return; }
    if (!editMode && !customer_id) { showToast('Select a customer','error'); return; }

    const cleanId = id_number.replace(/\\s+/g, '').toUpperCase();
    if (id_type === 'Aadhaar' && !/^\\d{12}$/.test(cleanId)) {
      showToast('Invalid Aadhaar! Must be 12 digits.','error'); return;
    }
    if (id_type === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanId)) {
      showToast('Invalid PAN format! (e.g. ABCDE1234F)','error'); return;
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled=true; btn.textContent=editMode?'Updating…':'Saving…';

    const payload = {
      customer_id:      +customer_id,
      id_type, id_number,
      address:          document.getElementById('f-address').value.trim()||null,
      deposit_amount:   +document.getElementById('f-deposit').value||0,
      kyc_status:       document.getElementById('f-kyc-status').value,
      agreement_signed: document.getElementById('f-agreement').checked,
      deposit_paid:     document.getElementById('f-deposit-paid').checked,
      notes:            document.getElementById('f-notes').value.trim()||null
    };

    try {
      const id  = document.getElementById('edit-id').value;
      const url = editMode ? \`\${API}/\${id}\` : API;
      const res = await fetch(url, { method: editMode?'PUT':'POST', headers:H(), body:JSON.stringify(payload) });
      const json= await res.json();
      if (!json.success) throw new Error(json.message);
      showToast(\`✅ KYC \${editMode?'updated':'created'}!\`, 'success');
      closeModal(); loadKYC();
    } catch(err) { showToast(err.message, 'error'); btn.disabled=false; btn.textContent=editMode?'Update KYC':'Save KYC Record'; }
  }

  async function verifyKYC(id) {
    if (!confirm('Mark this KYC as Verified?')) return;
    try {
      const r = allRecords.find(x=>x.id===id);
      const res = await fetch(\`\${API}/\${id}\`, { method:'PUT', headers:H(), body:JSON.stringify({...r, kyc_status:'Verified'}) });
      const json= await res.json();
      if (!json.success) throw new Error(json.message);
      showToast('✅ KYC Verified!', 'success'); loadKYC();
    } catch(err) { showToast(err.message, 'error'); }
  }

  `;

  const newContent = content.substring(0, brokenIndex) + correctCode + content.substring(endIndex);
  fs.writeFileSync(filepath, newContent, 'utf8');
  console.log('Fixed kyc.html');
} else {
  console.log('Could not find markers');
}
