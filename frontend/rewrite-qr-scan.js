const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'qr-scan.html');
const content = fs.readFileSync(filePath, 'utf8');

// Find the start of the first script tag that contains HTML5 QRCode logic.
// Looking at the file, the scanner logic is below `<main>`.
// Wait, the file actually has multiple `<script>` tags now because of my previous multi_replace.
// Let's just find the part where the `html5-qrcode` script is included and rewrite everything after `</body>`.
// The safest way is to split by `<!-- Success Card -->` end, which is `</div>\n  </div>\n</div>\n\n<div id="toast"></div>\n\n</main>`.

const parts = content.split('</main>');

if (parts.length < 2) {
  console.error("Could not find </main> tag!");
  process.exit(1);
}

// Re-assemble everything up to </main>
let newHtml = parts[0] + '</main>\n\n<script>\n';

const jsLogic = `
  let scanner = null;
  let scannedSerial = '';
  let currentBooking = null;

  // Formatter
  const fmtMoney = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  const fmtDate  = (dStr) => {
    if(!dStr) return '';
    return new Date(dStr).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  };

  function startScanner() {
    document.getElementById('scanner-placeholder').style.display = 'none';
    document.getElementById('qr-reader').style.display = 'block';
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('stop-btn').style.display  = 'block';
    setStatus('scanning', 'Camera active — point at QR/Barcode.');
    
    scanner = new Html5Qrcode("qr-reader");
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        stopScanner();
        document.getElementById('result-value').textContent = decodedText;
        document.getElementById('scan-result').classList.add('show');
        scannedSerial = decodedText;
        setStatus('success', 'Scan successful! Click Lookup.');
      },
      (error) => { /* ignore continuous errors */ }
    ).catch(err => {
      setStatus('error', 'Camera access denied or unavailable.');
      stopScanner();
    });
  }

  function stopScanner() {
    if (scanner) {
      scanner.stop().then(() => {
        scanner.clear();
        scanner = null;
      }).catch(console.error);
    }
    document.getElementById('scanner-placeholder').style.display = 'block';
    document.getElementById('qr-reader').style.display = 'none';
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('stop-btn').style.display  = 'none';
  }

  function rescan() {
    scannedSerial = '';
    currentBooking = null;
    document.getElementById('scan-result').classList.remove('show');
    document.getElementById('result-value').textContent = '—';
    document.getElementById('device-card').style.display = 'none';
    document.getElementById('form-card').style.display = 'none';
    setStatus('scanning', 'Ready to scan.');
    startScanner();
  }

  function manualLookup() {
    const val = document.getElementById('manual-serial').value.trim();
    if (!val) return showToast('Please enter a serial number', 'error');
    stopScanner();
    document.getElementById('scan-result').classList.add('show');
    document.getElementById('result-value').textContent = val;
    scannedSerial = val;
    lookupDevice();
  }

  async function lookupDevice() {
    if (!scannedSerial) return showToast('No serial number to lookup', 'error');
    try {
      setStatus('scanning', 'Looking up device in database...');
      
      const res = await fetch(\`\${API}/booking-lookup?serial=\${encodeURIComponent(scannedSerial)}\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.message || 'Device not found or not currently rented');
      }

      setStatus('success', 'Device active booking found: ' + scannedSerial);
      currentBooking = json.data;
      
      renderDeviceInfo();
      markStep(2);
    } catch (err) {
      setStatus('error', err.message);
      showToast(err.message, 'error');
      document.getElementById('device-card').style.display = 'none';
    }
  }

  function renderDeviceInfo() {
    const d = currentBooking;
    const g = document.getElementById('device-info-grid');
    g.innerHTML = \`
      <div class="info-item"><div class="label">Customer</div><div class="value">\${d.customer_name}</div></div>
      <div class="info-item"><div class="label">Phone</div><div class="value">\${d.customer_phone}</div></div>
      <div class="info-item"><div class="label">Device Name</div><div class="value">\${d.device_name}</div></div>
      <div class="info-item"><div class="label">Serial Number</div><div class="value">\${d.serial_number}</div></div>
      <div class="info-item"><div class="label">Rental Period</div><div class="value">\${fmtDate(d.rental_start)} — \${fmtDate(d.rental_end)}</div></div>
      <div class="info-item"><div class="label">Deposit Held</div><div class="value" style="color:var(--primary)">\${fmtMoney(d.deposit_amount)}</div></div>
    \`;
    document.getElementById('device-card').style.display = 'block';
    document.getElementById('device-card').scrollIntoView({ behavior:'smooth' });
  }

  function goToReturnForm() {
    document.getElementById('form-card').style.display = 'block';
    document.getElementById('f-booking-display').value = '#' + currentBooking.booking_id;
    document.getElementById('f-booking-id').value = currentBooking.booking_id;
    updateCalc();
    markStep(3);
    document.getElementById('form-card').scrollIntoView({ behavior:'smooth' });
  }

  function updateCalc() {
    if (!currentBooking) return;
    const dep = parseFloat(currentBooking.deposit_amount) || 0;
    const rep = parseFloat(document.getElementById('f-cost').value) || 0;
    
    document.getElementById('c-dep').textContent = fmtMoney(dep);
    document.getElementById('c-rep').textContent = fmtMoney(rep);
    
    const cond = document.getElementById('f-condition').value;
    if (cond && cond !== 'Good') {
      document.getElementById('calc-box').classList.add('visible');
    } else if (rep === 0) {
      document.getElementById('calc-box').classList.remove('visible');
    } else {
      document.getElementById('calc-box').classList.add('visible');
    }

    const ded = Math.min(rep, dep);
    const ref = Math.max(0, dep - ded);
    
    document.getElementById('c-ded').textContent = fmtMoney(ded);
    document.getElementById('c-ref').textContent = fmtMoney(ref);
  }

  async function submitReturn() {
    const booking_id = document.getElementById('f-booking-id').value;
    const return_date = document.getElementById('f-date').value;
    const condition = document.getElementById('f-condition').value;
    const damage_desc = document.getElementById('f-damage').value;
    const repair_cost = document.getElementById('f-cost').value || 0;
    const notes = document.getElementById('f-notes').value;

    if (!return_date || !condition) {
      return showToast('Return date and condition are required.', 'error');
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    try {
      const payload = {
        booking_id,
        return_date,
        device_condition: condition,
        damage_description: damage_desc,
        repair_cost: parseFloat(repair_cost),
        notes
      };

      const res = await fetch(\`\${API}/\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.message);

      markStep(4);
      setStatus('success', 'Return completed successfully.');
      document.getElementById('success-card').style.display = 'block';
      document.getElementById('success-msg').textContent = 
        \`Return Record #\${json.data.id} saved for \${currentBooking?.customer_name || 'customer'} — \${currentBooking?.device_name || scannedSerial}\`;
      document.getElementById('success-card').scrollIntoView({ behavior:'smooth' });

    } catch (err) {
      showToast(err.message || 'Submit failed', 'error');
      btn.disabled = false; 
      btn.textContent = '✅ Submit Return Record';
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function resetAll() {
    scannedSerial  = '';
    currentBooking = null;
    stopScanner();
    document.getElementById('scan-result').classList.remove('show');
    document.getElementById('manual-serial').value = '';
    document.getElementById('device-card').style.display  = 'none';
    document.getElementById('form-card').style.display    = 'none';
    document.getElementById('success-card').style.display = 'none';
    ['f-date','f-condition','f-damage','f-cost','f-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('calc-box').classList.remove('visible');
    [1,2,3,4].forEach(n => {
      document.getElementById(\`step\${n}\`).className = 'step-circle';
      document.getElementById(\`step\${n}-label\`).className = 'step-label';
    });
    document.getElementById('step1').classList.add('active');
    document.getElementById('step1-label').classList.add('active');
    setStatus('scanning', 'Ready to scan.');
    
    // Re-enable submit button
    const btn = document.getElementById('submit-btn');
    btn.disabled = false;
    btn.textContent = '✅ Submit Return Record';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markStep(n) {
    for (let i = 1; i < n; i++) {
      document.getElementById(\`step\${i}\`).className       = 'step-circle done';
      document.getElementById(\`step\${i}-label\`).className = 'step-label';
      if (i < 4) document.getElementById(\`line\${i}\`).className = 'step-line done';
    }
    document.getElementById(\`step\${n}\`).className       = 'step-circle active';
    document.getElementById(\`step\${n}-label\`).className = 'step-label active';
  }

  function setStatus(type, msg) {
    const bar = document.getElementById('status-bar');
    bar.className  = \`status-bar show \${type}\`;
    document.getElementById('status-text').textContent = msg;
  }

  function showToast(msg, type='success') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = \`show \${type}\`;
    setTimeout(() => { t.className = ''; }, 3500);
  }

  // Init
  document.getElementById('f-date').valueAsDate = new Date();
  setStatus('scanning', 'Ready — click Start Scanner or enter serial manually.');
</script>

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
</body>
</html>
`;

newHtml += jsLogic;

fs.writeFileSync(filePath, newHtml, 'utf8');
console.log("Successfully rewrote qr-scan.html scripts and connected to backend!");
