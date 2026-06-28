const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const db       = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { uploadToCloudinary, getThumbnailUrl, deleteFromCloudinary } = require('../utils/cloudinary');

// Multer — memory storage (files go to Cloudinary, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ── POST /api/upload/damage/:returnId ─────────────────────────────────────────
router.post('/damage/:returnId', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const returnId = req.params.returnId;

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:      `device-returns/record-${returnId}`,
      public_id:   `dmg_${Date.now()}`,
      transformation: [
        { width: 1200, height: 900, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ]
    });

    const thumbnailUrl = getThumbnailUrl(result.public_id);
    const description  = req.body.description || null;

    // Save to DB
    const { rows } = await db.query(
      `INSERT INTO damage_evidence (return_id, photo_url, thumbnail_url, public_id, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [returnId, result.secure_url, thumbnailUrl, result.public_id, description]
    );

    // Update main record's photo URL
    await db.query(
      `UPDATE return_records SET damage_photo_url=$1 WHERE id=$2`,
      [result.secure_url, returnId]
    );

    res.status(201).json({
      success: true,
      message: 'Photo uploaded to Cloudinary',
      data: {
        id:           rows[0].id,
        return_id:    returnId,
        photo_url:    result.secure_url,
        thumbnail_url:thumbnailUrl,
        public_id:    result.public_id,
        description,
        cloudinary_info: {
          width:  result.width,
          height: result.height,
          format: result.format,
          bytes:  result.bytes
        }
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/upload/damage/:returnId ─────────────────────────────────────────
router.get('/damage/:returnId', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM damage_evidence WHERE return_id=$1 ORDER BY uploaded_at DESC`,
      [req.params.returnId]
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/upload/damage/photo/:photoId ──────────────────────────────────
router.delete('/damage/photo/:photoId', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM damage_evidence WHERE id=$1`, [req.params.photoId]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Photo not found' });

    // Delete from Cloudinary
    if (rows[0].public_id) {
      await deleteFromCloudinary(rows[0].public_id);
    }

    // Delete from DB
    await db.query(`DELETE FROM damage_evidence WHERE id=$1`, [req.params.photoId]);
    res.json({ success: true, message: 'Photo deleted from Cloudinary and DB' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;