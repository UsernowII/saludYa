const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/authenticate');
const {
  getAvailable,
  create,
  getMyAppointments,
  cancel,
  reschedule,
} = require('../controllers/appointmentController');

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment booking and management
 */

/**
 * @swagger
 * /appointments/available:
 *   get:
 *     summary: List available time slots for a specialty on a given date
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: specialtyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the medical specialty
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Array of doctors with their available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   doctorId:
 *                     type: integer
 *                   doctorName:
 *                     type: string
 *                   specialty:
 *                     type: string
 *                   slots:
 *                     type: array
 *                     items:
 *                       type: string
 *                       example: "09:00"
 *       400:
 *         description: Missing or invalid query parameters
 */
router.get('/available', authenticate, getAvailable);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Book a new appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, scheduledAt]
 *             properties:
 *               doctorId:
 *                 type: integer
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-15T09:00:00.000Z"
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment created
 *       409:
 *         description: Time slot no longer available
 */
router.post('/', authenticate, authorize('patient'), create);

/**
 * @swagger
 * /appointments/my:
 *   get:
 *     summary: List all appointments for the authenticated patient
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of appointment records
 */
router.get('/my', authenticate, getMyAppointments);

/**
 * @swagger
 * /appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel an appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Appointment cancelled
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.patch('/:id/cancel', authenticate, cancel);

/**
 * @swagger
 * /appointments/{id}/reschedule:
 *   patch:
 *     summary: Reschedule an appointment to a new time slot
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduledAt]
 *             properties:
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Appointment rescheduled
 *       409:
 *         description: New time slot not available
 */
router.patch('/:id/reschedule', authenticate, reschedule);

module.exports = router;
