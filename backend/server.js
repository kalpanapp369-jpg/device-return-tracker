const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();
require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── SERVE FRONTEND STATIC FILES ────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Swagger docs
try {
  const { specs, swaggerUi } = require('./swagger');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customSiteTitle: 'Device Return Tracker API',
    customCss: '.swagger-ui .topbar { background: #2563eb; }',
    swaggerOptions: { persistAuthorization: true }
  }));
  console.log('📚 Swagger docs → /api/docs');
} catch(e) { console.log('Swagger skipped:', e.message); }

// ── ALL ROUTES ─────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/customer',    require('./routes/customer'));
app.use('/api/bookings',    require('./routes/bookings'));
app.use('/api/returns',     require('./routes/returns'));
app.use('/api/upload',      require('./routes/upload'));
app.use('/api/analytics',   require('./routes/analytics'));
app.use('/api/settlement',  require('./routes/settlement'));
app.use('/api/audit',       require('./routes/audit'));
app.use('/api/ai',          require('./routes/ai'));
app.use('/api/kyc',         require('./routes/kyc'));
app.use('/api/logistics',   require('./routes/logistics'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/whatsapp',    require('./routes/whatsapp'));

// Root → redirect to login page
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'login.html')));

app.use((req, res) => res.status(404).json({ success:false, message:`Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ success:false, message:err.message }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server        → http://localhost:${PORT}`);
  console.log(`📚 API Docs      → http://localhost:${PORT}/api/docs`);
  console.log(`🤖 AI Endpoints  → http://localhost:${PORT}/api/ai/*`);
  console.log(`📱 WhatsApp      → http://localhost:${PORT}/api/whatsapp/*`);
  console.log(`📋 KYC           → http://localhost:${PORT}/api/kyc/*`);
  console.log(`🚚 Logistics     → http://localhost:${PORT}/api/logistics/*`);
  console.log(`🔧 Maintenance   → http://localhost:${PORT}/api/maintenance/*`);
});