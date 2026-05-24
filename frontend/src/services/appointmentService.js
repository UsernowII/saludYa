import api from './api'

export const appointmentService = {
  /**
   * Get available slots for a specialty on a given date.
   * Returns an array of { doctor, slots[] } objects.
   */
  getAvailable: (specialtyId, date) =>
    api.get('/appointments/available', { params: { specialtyId, date } }),

  /**
   * Book an appointment.
   * scheduledAt: ISO 8601 string
   */
  create: (doctorId, scheduledAt, notes = '') =>
    api.post('/appointments', { doctorId, scheduledAt, notes }),

  /**
   * Get appointments for the currently authenticated patient.
   */
  getMyAppointments: () =>
    api.get('/appointments/me'),

  /**
   * Cancel an appointment by id.
   */
  cancel: (id) =>
    api.patch(`/appointments/${id}/cancel`),

  /**
   * Reschedule an existing appointment.
   * scheduledAt: ISO 8601 string
   */
  reschedule: (id, scheduledAt) =>
    api.patch(`/appointments/${id}/reschedule`, { scheduledAt }),

  /**
   * Get all available medical specialties.
   */
  getSpecialties: () =>
    api.get('/specialties'),

  /**
   * Get today's appointments for the logged-in doctor.
   */
  getDoctorToday: () =>
    api.get('/appointments/doctor/today'),

  /**
   * Admin: get aggregated metrics (today's totals).
   */
  getAdminMetrics: () =>
    api.get('/appointments/admin/metrics'),
}
