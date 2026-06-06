import { describe, test, expect } from 'vitest';
import { bookingReducer, initialState } from '../../reducers/bookingReducer';

describe('bookingReducer', () => {
  test('SELECT_SPECIALTY avanza al paso 2 y limpia doctor y slot', () => {
    const state = bookingReducer(initialState, {
      type: 'SELECT_SPECIALTY',
      payload: { id: 1, name: 'Medicina General' },
    });
    expect(state.step).toBe(2);
    expect(state.specialty.name).toBe('Medicina General');
    expect(state.doctor).toBeNull();
    expect(state.slot).toBeNull();
  });

  test('SELECT_DATE avanza al paso 3', () => {
    const prev = { ...initialState, step: 2, specialty: { id: 1 } };
    const state = bookingReducer(prev, { type: 'SELECT_DATE', payload: '2026-12-15' });
    expect(state.step).toBe(3);
    expect(state.date).toBe('2026-12-15');
  });

  test('RESET vuelve al estado inicial', () => {
    const dirty = { step: 4, specialty: { id: 1 }, doctor: { id: 2 }, slot: '09:00', date: '2026-12-15' };
    const state = bookingReducer(dirty, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});
