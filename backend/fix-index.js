const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/index.html');
let content = fs.readFileSync(file, 'utf8');

const replacement = `  </div>
</aside>

<!-- MAIN CONTENT -->
<main class="main-content">
  <div class="page-header">
    <h1 class="page-title">Dashboard Overview</h1>
  </div>


  <!-- Stats -->
  <div class="stats-row">
    <div class="stat-card accent-blue anim-fade-in-up anim-delay-1">
      <div class="stat-icon blue">📦</div>
      <div class="stat-label">Total Returns</div>
      <div class="stat-value blue" id="stat-total">—</div>
      <div class="stat-trend">All time records</div>
    </div>
    <div class="stat-card accent-orange anim-fade-in-up anim-delay-2">
      <div class="stat-icon orange">⏳</div>
      <div class="stat-label">Pending Settlement</div>
      <div class="stat-value orange" id="stat-pending">—</div>
      <div class="stat-trend">Awaiting review</div>
    </div>
    <div class="stat-card accent-green anim-fade-in-up anim-delay-3">
      <div class="stat-icon green">✅</div>
      <div class="stat-label">Good Condition</div>
      <div class="stat-value green" id="stat-good">—</div>
      <div class="stat-trend">No damage</div>
    </div>
    <div class="stat-card accent-red anim-fade-in-up anim-delay-4">
      <div class="stat-icon red">⚠️</div>
      <div class="stat-label">Damaged Devices</div>
      <div class="stat-value red" id="stat-damaged">—</div>
      <div class="stat-trend">Needs attention</div>
    </div>
  </div>

  <!-- Main Card -->
  <div class="card anim-fade-in-up">
    <div class="card-header">
      <div class="card-title">📋 Return Records</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ai btn-sm" onclick="openAIChatModal()">🤖 AI Assistant</button>
        <button class="btn btn-excel btn-sm" onclick="exportExcel()">📊 Excel</button>
        <button class="btn btn-pdf btn-sm" onclick="exportPDF()">📄 PDF</button>
        <button class="btn btn-primary" onclick="openAddModal()">+ New Return</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-input" placeholder="Search customer, device, booking…" oninput="debounceLoad()"/>
        </div>
        <select class="fs" id="filter-status" onchange="loadRecords(1)">
          <option value="">All Statuses</option>
          <option value="Pending">⏳ Pending</option>
          <option value="Approved">✅ Approved</option>
          <option value="Settled">💰 Settled</option>
          <option value="Rejected">❌ Rejected</option>
        </select>
        <select class="fs" id="filter-condition" onchange="loadRecords(1)">
          <option value="">All Conditions</option>
          <option value="Good">✅ Good</option>
          <option value="Minor Scratches">⚠️ Minor Scratches</option>
          <option value="Major Damage">❌ Major Damage</option>
          <option value="Non-Functional">🚫 Non-Functional</option>
        </select>
        <span style="font-size:12px;color:var(--text-3)">From</span>
        <input type="date" class="fd" id="filter-from" onchange="loadRecords(1)"/>
        <span style="font-size:12px;color:var(--text-3)">To</span>
        <input type="date" class="fd" id="filter-to" onchange="loadRecords(1)"/>
        <select class="fs" id="sort-select" onchange="loadRecords(1)">
          <option value="created_at">🕐 Newest First</option>
          <option value="return_date">📅 Return Date</option>
          <option value="repair_cost">💸 Repair Cost</option>
          <option value="settlement_status">📊 Status</option>
        </select>
        <button class="btn btn-ghost btn-sm" id="clear-btn" onclick="clearFilters()" style="display:none">✕ Clear</button>
      </div>
    </div>

    <!-- Result bar -->
    <div class="result-bar" id="result-bar" style="display:none">
      <span id="result-count"></span>
      <span class="clear-link" onclick="clearFilters()">✕ Clear filters</span>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Customer</th><th>Device</th><th>Return Date</th>
            <th>Condition</th><th>Repair Cost</th><th>Refund</th><th>Status</th><th>AI</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="table-body">
          <tr><td colspan="10">
            <div class="table-empty">
              <span class="empty-icon">⏳</span>
              <p>Loading records…</p>
            </div>
          </td></tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination" id="pagination" style="display:none">
      <div class="pagination-info" id="pg-info"></div>
      <div class="pagination-btns" id="pg-btns"></div>
    </div>
  </div>
  </div>
</main>

<!-- ═══ ADD/EDIT MODAL ══════════════════════════════════════ -->
<div class="modal-backdrop" id="form-modal" onclick="handleBD(event,'form-modal')">
  <div class="modal wide">
    <div class="modal-header">
      <div class="modal-title" id="form-title">📦 New Return Record</div>
      <button class="modal-close" onclick="closeFormModal()">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="edit-id"/>
      <div class="form-grid">
        <div class="form-group" id="grp-booking">
          <label for="f-bid">Booking ID <span class="req">*</span></label>
          <input type="number" id="f-bid" placeholder="e.g. 1" min="1" oninput="clearFE('f-bid')"/>
          <span class="hint">From the rental_bookings table</span>
        </div>
        <div class="form-group">
          <label for="f-date">Return Date <span class="req">*</span></label>
          <input type="date" id="f-date" oninput="clearFE('f-date')"/>
        </div>
        <div class="form-group full">
          <label for="f-cond">Device Condition <span class="req">*</span></label>
          <select id="f-cond" onchange="updateCalc();clearFE('f-cond')">
            <option value="">— Select condition —</option>
            <option value="Good">✅ Good — No damage</option>
            <option value="Minor Scratches">⚠️ Minor Scratches — Cosmetic only</option>
            <option value="Major Damage">❌ Major Damage — Structural</option>
            <option value="Non-Functional">🚫 Non-Functional — Does not power on</option>
          </select>
        </div>
        <div class="form-group full">
          <label for="f-desc">Damage Description</label>
          <textarea id="f-desc" placeholder="Describe any visible damage…"></textarea>
        </div>
        <div class="form-group">
          <label for="f-cost">Repair Cost (₹)</label>
          <input type="number" id="f-cost" placeholder="0.00" min="0" step="0.01" oninput="updateCalc()"/>
        </div>
        <div class="form-group">
          <label for="f-status">Settlement Status</label>
          <select id="f-status">
            <option value="Pending">⏳ Pending</option>
            <option value="Approved">✅ Approved</option>
            <option value="Settled">💰 Settled</option>
            <option value="Rejected">❌ Rejected</option>
          </select>
        </div>
        <div class="form-group full">
          <label for="f-notes">Notes</label>
          <input type="text" id="f-notes" placeholder="Optional internal notes…"/>
        </div>
        <div class="form-group full">
          <div class="calc-box" id="calc-box">
            <div class="calc-row"><span>Repair cost</span><span id="c-rep">₹0</span></div>
            <div class="calc-row total"><span>Estimated Refund</span><span id="c-ref">—</span></div>
          </div>
        </div>
        <!-- AI helpers -->
        <div class="form-group full">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-ai btn-sm" onclick="aiGenerateSummary()">🤖 AI Damage Summary</button>
            <button type="button" class="btn btn-ai btn-sm" onclick="aiEstimateRepair()">🤖 AI Repair Estimate</button>
          </div>
          <div class="ai-panel" id="form-ai-panel" style="margin-top:10px;display:none">
            <div class="ai-panel-title">🤖 AI Analysis Result</div>
            <div id="form-ai-content"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeFormModal()">Cancel</button>
      <button class="btn btn-primary" id="form-submit-btn" onclick="submitForm()">💾 Save Return Record</button>
    </div>
  </div>
</div>

<!-- ═══ SETTLEMENT MODAL ════════════════════════════════════ -->
<div class="modal-backdrop" id="settle-modal" onclick="handleBD(event,'settle-modal')">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="settle-title">⚖️ Settlement Decision</div>
      <button class="modal-close" onclick="closeSettleModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="settle-info" id="settle-info"></div>
      <div class="form-group">
        <label>Notes / Reason</label>
        <textarea id="settle-notes" placeholder="Add settlement notes…" style="min-height:90px"></textarea>
      </div>
      <div class="ai-panel" id="settle-ai-panel" style="margin-top:12px;display:none">
        <div class="ai-panel-title">🤖 AI Email Draft Preview</div>
        <div class="ai-result" id="settle-ai-draft">Generating AI email draft…</div>
        <div style="font-size:11px;color:#7c3aed;margin-top:4px">✨ This AI-drafted email will be sent to the customer automatically.</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeSettleModal()">Cancel</button>
      <button class="btn btn-reject"  id="s-reject-btn"  onclick="doSettle('reject')">❌ Reject</button>
      <button class="btn btn-settle"  id="s-settle-btn"  onclick="doSettle('settle')">✔ Mark Settled</button>
      <button class="btn btn-approve" id="s-approve-btn" onclick="doSettle('approve')">✅ Approve + Email</button>
    </div>
  </div>
</div>

<!-- ═══ PHOTO MODAL ══════════════════════════════════════════ -->
<div class="modal-backdrop" id="photo-modal" onclick="handleBD(event,'photo-modal')">
  <div class="modal wide">
    <div class="modal-header">
      <div class="modal-title" id="photo-modal-title">📸 Damage Photos</div>
      <button class="modal-close" onclick="closePhotoModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="photo-dropzone" id="dropzone"
           onclick="document.getElementById('photo-file-input').click()"
           ondragover="event.preventDefault();this.classList.add('drag')"
           ondragleave="this.classList.remove('drag')"
           ondrop="handleDrop(event)">
        <span class="dz-icon">☁️</span>
        <p style="font-weight:600;color:var(--text-1);margin-bottom:4px">Click to upload or drag & drop</p>
        <small style="color:var(--text-3)">JPG, PNG, WEBP — max 5MB · Saved to Cloudinary</small>
      </div>
      <input type="file" id="photo-file-input" accept="image/*" multiple onchange="handleFileSelect(event)" style="display:none"/>
      <div id="upload-status" style="margin-top:10px;font-size:12px;color:var(--text-2)"></div>
      <div style="margin-top:16px">
        <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:10px">☁️ Cloudinary Photos</div>
        <div class="photo-grid" id="photo-grid"><div class="no-photos">No photos uploaded yet.</div></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closePhotoModal()">Close</button>
    </div>
  </div>
</div>

<!-- ═══ AI CHAT MODAL ════════════════════════════════════════ -->
<div class="modal-backdrop" id="chat-modal" onclick="handleBD(event,'chat-modal')">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">🤖 AI Assistant</div>
      <button class="modal-close" onclick="closeChatModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="font-size:12px;color:var(--text-3);margin-bottom:12px">Powered by Gemini AI · Ask anything about returns, damage, or settlements</div>
      <div class="chat-messages" id="chat-messages">
        <div class="chat-msg ai">👋 Hi! I'm your Device Return AI Assistant. Ask me about damage assessment, repair costs, deposit settlements, or any return record!</div>
      </div>
      <div class="chat-input-row">
        <input type="text" id="chat-input" placeholder="Ask anything…" onkeydown="if(event.key==='Enter')sendChat()"/>
        <button class="btn btn-primary" onclick="sendChat()">Send</button>
      </div>
    </div>
  </div>
</div>

<!-- ═══ DELETE MODAL ═════════════════════════════════════════ -->
<div class="modal-backdrop" id="delete-modal" onclick="handleBD(event,'delete-modal')">
  <div class="modal narrow">
    <div class="modal-body" style="padding:30px 26px 10px;text-align:center">
      <div class="del-icon-wrap">🗑️</div>
      <div class="del-title">Delete Return Record?</div>
      <div class="del-msg">This will permanently delete the record and revert the booking back to <strong>Active</strong>. This action cannot be undone.</div>
      <div class="del-box" id="del-detail"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeDeleteModal()">Cancel</button>
      <button class="btn btn-danger" id="del-confirm-btn" onclick="confirmDelete()">Yes, Delete</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
  const API  = 'http://localhost:5000/api/returns';
  const SAPI = 'http://localhost:5000/api/settlement';
  const UPL  = 'http://localhost:5000/api/upload';
`;

content = content.replace(
  "  <div class=\"sidebar-footer\">\r\n    <button class=\"theme-toggle-btn\" onclick=\"toggleTheme()\">🌓 Toggle Theme</button>\r\n  const AAPI = 'http://localhost:5000/api/ai';",
  "  <div class=\"sidebar-footer\">\r\n    <button class=\"theme-toggle-btn\" onclick=\"toggleTheme()\">🌓 Toggle Theme</button>\r\n" + replacement + "  const AAPI = 'http://localhost:5000/api/ai';"
);

fs.writeFileSync(file, content);
console.log('Fixed index.html');
