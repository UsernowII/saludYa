const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authenticate');
const { query } = require('../config/database');

/**
 * @swagger
 * /specialties:
 *   get:
 *     summary: List all medical specialties
 *     tags: [Specialties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of specialties
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, description FROM specialties ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getSpecialties error:', err);
    res.status(500).json({ error: 'Failed to load specialties.' });
  }
});

module.exports = router;
