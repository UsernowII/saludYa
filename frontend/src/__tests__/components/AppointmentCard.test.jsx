import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import AppointmentCard from '../../components/AppointmentCard';

const mockAppointment = {
  id: 1,
  doctor: { name: 'Dra. Camila Ríos', specialty: 'Medicina General' },
  scheduledAt: '2026-12-15T09:00:00Z',
  status: 'confirmed',
};

describe('AppointmentCard', () => {
  test('muestra el nombre del médico y la especialidad', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('Dra. Camila Ríos')).toBeInTheDocument();
    expect(screen.getByText('Medicina General')).toBeInTheDocument();
  });

  test('muestra botones de cancelar y reagendar cuando status es confirmed', () => {
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
    expect(onCancel).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText('Reagendar'));
    expect(onReschedule).toHaveBeenCalledWith(1);
  });

  test('no muestra botones cuando status es cancelled', () => {
    const cancelled = { ...mockAppointment, status: 'cancelled' };
    render(<AppointmentCard appointment={cancelled} onCancel={vi.fn()} onReschedule={vi.fn()} />);
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });
});
