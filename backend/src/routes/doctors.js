const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/authenticate');
const {
  getMyAppointments,
  getSchedule,
  updateSchedule,
  addBlockedDate,
  getBlockedDates,
} = require('../controllers/doctorController');

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor-specific schedule and appointment management
 */

/**
 * @swagger
 * /doctors/appointments:
 *   get:
 *     summary: List the authenticated doctor's appointments for a given date
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date (YYYY-MM-DD). Defaults to today.
 *     responses:
 *       200:
 *         description: Array of appointment records with patient info
 *       403:
 *         description: Forbidden — doctors only
 */
router.get('/appointments', authenticate, authorize('doctor'), getMyAppointments);

/**
 * @swagger
 * /doctors/schedule:
 *   get:
 *     summary: Get the authenticated doctor's weekly availability schedule
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of schedule entries (one per weekday)
 */
router.get('/schedule', authenticate, authorize('doctor'), getSchedule);

/**
 * @swagger
 * /doctors/schedule:
 *   put:
 *     summary: Upsert the authenticated doctor's weekly availability
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [schedules]
 *             properties:
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [dayOfWeek, startTime, endTime]
 *                   properties:
 *                     dayOfWeek:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                       description: "0 = Sunday, 6 = Saturday"
 *                     startTime:
 *                       type: string
 *                       example: "08:00"
 *                     endTime:
 *                       type: string
 *                       example: "17:00"
 *                     slotDurationMinutes:
 *                       type: integer
 *                       default: 30
 *     responses:
 *       200:
 *         description: Updated schedule entries
 */
router.put('/schedule', authenticate, authorize('doctor'), updateSchedule);

/**
 * @swagger
 * /doctors/blocked-dates:
 *   post:
 *     summary: Add a blocked date (no appointments allowed)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-04"
 *               reason:
 *                 type: string
 *                 example: "Día festivo"
 *     responses:
 *       201:
 *         description: Blocked date added
 */
router.post('/blocked-dates', authenticate, authorize('doctor'), addBlockedDate);

/**
 * @swagger
 * /doctors/blocked-dates:
 *   get:
 *     summary: List all blocked dates for the authenticated doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of blocked date records
 */
router.get('/blocked-dates', authenticate, authorize('doctor'), getBlockedDates);

module.exports = router;
