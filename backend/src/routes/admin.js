const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/authenticate');
const {
  getMetrics,
  getDoctors,
  createDoctor,
  toggleDoctorStatus,
} = require('../controllers/adminController');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative endpoints (admin role required)
 */

/**
 * @swagger
 * /admin/metrics:
 *   get:
 *     summary: Get today's appointment metrics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointment statistics for today
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalToday:
 *                   type: integer
 *                 confirmedToday:
 *                   type: integer
 *                 cancelledToday:
 *                   type: integer
 *                 completedToday:
 *                   type: integer
 *                 cancellationRate:
 *                   type: number
 *                   description: Percentage of today's appointments that were cancelled
 *       403:
 *         description: Forbidden — admins only
 */
router.get('/metrics', authenticate, authorize('admin'), getMetrics);

/**
 * @swagger
 * /admin/doctors:
 *   get:
 *     summary: List all doctors with their user info and specialty
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of doctor records
 */
router.get('/doctors', authenticate, authorize('admin'), getDoctors);

/**
 * @swagger
 * /admin/doctors:
 *   post:
 *     summary: Create a new doctor account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, specialtyId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. Carlos López
 *               email:
 *                 type: string
 *                 format: email
 *               specialtyId:
 *                 type: integer
 *               bio:
 *                 type: string
 *     responses:
 *       201:
 *         description: Doctor created (includes tempPassword field)
 *       409:
 *         description: Email already in use
 */
router.post('/doctors', authenticate, authorize('admin'), createDoctor);

/**
 * @swagger
 * /admin/doctors/{id}/status:
 *   patch:
 *     summary: Toggle a doctor's active status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor record ID
 *     responses:
 *       200:
 *         description: Updated doctor record
 *       404:
 *         description: Doctor not found
 */
router.patch('/doctors/:id/status', authenticate, authorize('admin'), toggleDoctorStatus);

module.exports = router;
