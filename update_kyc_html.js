const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'frontend', 'kyc.html');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Update the submit button
content = content.replace(
  '<button class="btn btn-primary" id="submit-btn" onclick="submitKYC()">Save KYC Record</button>',
  '<button class="btn btn-primary" id="submit-btn" onclick="initiateOTP()">Send OTP & Verify</button>'
);

// 2. Add the OTP modal HTML just before the toast
const otpModalHTML = `
<div class="modal-overlay" id="otp-modal" style="z-index:1100;">
  <div class="modal" style="max-width: 400px; text-align: center;">
    <h3 style="margin-bottom: 10px;">Enter OTP</h3>
    <p style="color: var(--text-2); font-size: 13px; margin-bottom: 20px;">An OTP has been sent to the customer's email and phone.</p>
    <input type="text" id="f-otp" placeholder="6-digit OTP" maxlength="6" style="font-size: 20px; text-align: center; letter-spacing: 4px; padding: 12px; margin-bottom: 20px; width: 100%;">
    <div style="display:flex;gap:12px;justify-content:center;">
      <button class="btn btn-ghost" onclick="document.getElementById('otp-modal').classList.remove('open')">Cancel</button>
      <button class="btn btn-primary" id="verify-otp-btn" onclick="submitOTP()">Verify & Save</button>
    </div>
  </div>
</div>
`;
content = content.replace('<div id="toast"></div>', otpModalHTML + '\n<div id="toast"></div>');

// 3. Add the JS functions for OTP
const otpJS = `
  async function initiateOTP() {
    if (editMode) {
      // If editing, skip OTP
      return submitKYC();
    }
    
    // Validate form first
    const customer_id = document.getElementById('f-customer').value;
    const id_type     = document.getElementById('f-idtype').value;
    const id_number   = document.getElementById('f-idnum').value.trim();
    if (!customer_id) { showToast('Select a customer','error'); return; }
    if (!id_type || !id_number) { showToast('ID Type and ID Number are required','error'); return; }
    
    const cleanId = id_number.replace(/\\s+/g, '').toUpperCase();
    if (id_type === 'Aadhaar' && !/^\\d{12}$/.test(cleanId)) {
      showToast('Invalid Aadhaar! Must be 12 digits.','error'); return;
    }
    if (id_type === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanId)) {
      showToast('Invalid PAN format!','error'); return;
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true; btn.textContent = 'Sending OTP...';

    try {
      const res = await fetch(\`\${API}/send-otp\`, { method: 'POST', headers: H(), body: JSON.stringify({ customer_id: +customer_id }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      
      showToast('OTP sent to customer!', 'success');
      document.getElementById('f-otp').value = '';
      document.getElementById('otp-modal').classList.add('open');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Send OTP & Verify';
    }
  }

  async function submitOTP() {
    const customer_id = document.getElementById('f-customer').value;
    const otp = document.getElementById('f-otp').value.trim();
    if (otp.length !== 6) { showToast('Enter 6-digit OTP', 'error'); return; }

    const btn = document.getElementById('verify-otp-btn');
    btn.disabled = true; btn.textContent = 'Verifying...';

    try {
      const res = await fetch(\`\${API}/verify-otp\`, { method: 'POST', headers: H(), body: JSON.stringify({ customer_id: +customer_id, otp }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      
      // OTP matched, now save KYC
      showToast('OTP Verified! Saving KYC...', 'success');
      document.getElementById('otp-modal').classList.remove('open');
      
      // Ensure status is Verified for new records
      document.getElementById('f-kyc-status').value = 'Verified';
      await submitKYC();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Verify & Save';
    }
  }
`;

content = content.replace('async function submitKYC() {', otpJS + '\n  async function submitKYC() {\n    const btn = document.getElementById("submit-btn");\n    // Remove duplicate validation since initiateOTP does it\n');

// Minor fix to reset button text in openAddModal and openEditModal
content = content.replace("document.getElementById('submit-btn').textContent  = 'Save KYC Record';", "document.getElementById('submit-btn').textContent  = 'Send OTP & Verify';");
content = content.replace("btn.textContent='Save KYC Record';", "btn.textContent='Send OTP & Verify';");

fs.writeFileSync(filepath, content, 'utf8');
console.log('Successfully updated kyc.html for OTP functionality');
