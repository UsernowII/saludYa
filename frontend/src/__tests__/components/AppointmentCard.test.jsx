import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import AppointmentCard from '../../components/AppointmentCard';

// Estructura que devuelve el backend real
const mockAppointment = {
  id: 1,
  doctor_name: 'Dra. Camila Ríos',
  specialty: 'Medicina General',
  scheduled_at: '2026-12-15T09:00:00Z',
  status: 'confirmed',
};

describe('AppointmentCard', () => {
  test('muestra el nombre del médico y la especialidad', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('Dra. Camila Ríos')).toBeInTheDocument();
    expect(screen.getByText(/Medicina General/i)).toBeInTheDocument();
  });

  test('muestra botones de cancelar y reprogramar cuando status es confirmed', () => {
    const onCancel = vi.fn();
    const onReschedule = vi.fn();

    render(
      <AppointmentCard
        appointment={mockAppointment}
        onCancel={onCancel}
        onReschedule={onReschedule}
      />
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledWith(mockAppointment);

    fireEvent.click(screen.getByText('Reprogramar'));
    expect(onReschedule).toHaveBeenCalledWith(mockAppointment);
  });

  test('no muestra botones cuando status es cancelled', () => {
    const cancelled = { ...mockAppointment, status: 'cancelled' };
    render(<AppointmentCard appointment={cancelled} onCancel={vi.fn()} onReschedule={vi.fn()} />);
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    expect(screen.queryByText('Reprogramar')).not.toBeInTheDocument();
  });
});
