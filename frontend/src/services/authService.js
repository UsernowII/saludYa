import api from './api'

export const authService = {
  /**
   * Authenticate a user.
   * Returns { token, user }
   */
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  /**
   * Create a new patient account.
   * Returns { token, user }
   */
  register: (data) =>
    api.post('/auth/register', data),

  /**
   * Request a password-reset email.
   */
  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  /**
   * Complete a password reset with the token from the email.
   */
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),

  /**
   * Fetch the current authenticated user's profile.
   */
  me: () =>
    api.get('/auth/me'),
}
