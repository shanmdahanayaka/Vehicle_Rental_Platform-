/**
 * Unit Tests for CancelBookingButton Component
 *
 * Tests the booking cancellation functionality including:
 * - Rendering
 * - Modal interactions
 * - API integration
 * - Error handling
 * - Loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CancelBookingButton from '@/components/CancelBookingButton';

// Get the mocked functions
const mockUseRouter = useRouter as jest.Mock;

describe('CancelBookingButton', () => {
  const mockRefresh = jest.fn();
  const defaultProps = {
    bookingId: 'booking-123',
    vehicleName: 'Toyota Camry',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ refresh: mockRefresh });
    (global.fetch as jest.Mock).mockClear();
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('should render the cancel booking button', () => {
      render(<CancelBookingButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /cancel booking/i });
      expect(button).toBeInTheDocument();
    });

    it('should have correct text', () => {
      render(<CancelBookingButton {...defaultProps} />);

      expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
    });

    it('should have red text color', () => {
      render(<CancelBookingButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('text-red');
    });
  });

  // ============================================
  // MODAL TESTS
  // ============================================
  describe('modal', () => {
    it('should open modal when button is clicked', () => {
      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Modal header has "Cancel Booking" and the button also has it
      expect(screen.getAllByText('Cancel Booking').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
    });

    it('should display vehicle name in confirmation message', () => {
      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
    });

    it('should display cancellation policy', () => {
      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Cancellation Policy')).toBeInTheDocument();
      expect(screen.getByText(/Free cancellation for pending bookings/)).toBeInTheDocument();
    });

    it('should close modal when Keep Booking button is clicked', () => {
      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Keep Booking'));
      expect(screen.queryByText('This action cannot be undone')).not.toBeInTheDocument();
    });

    it('should have Yes, Cancel button', () => {
      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Yes, Cancel')).toBeInTheDocument();
    });
  });

  // ============================================
  // API INTEGRATION TESTS
  // ============================================
  describe('API integration', () => {
    it('should call API with correct parameters when confirming cancellation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Yes, Cancel'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/bookings/booking-123',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel' }),
          })
        );
      });
    });

    it('should close modal and refresh page on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Yes, Cancel'));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should show error message when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Booking cannot be cancelled' }),
      });

      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Yes, Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Booking cannot be cancelled')).toBeInTheDocument();
      });
    });

    it('should show default error message when API fails without message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Yes, Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Failed to cancel booking')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Yes, Cancel'));

      await waitFor(() => {
        expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // LOADING STATE TESTS
  // ============================================
  describe('loading state', () => {
    it('should show loading state while cancelling', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementationOnce(() => pendingPromise);

      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Yes, Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Cancelling...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    it('should disable buttons while loading', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementationOnce(() => pendingPromise);

      render(<CancelBookingButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Yes, Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Keep Booking')).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });
});
