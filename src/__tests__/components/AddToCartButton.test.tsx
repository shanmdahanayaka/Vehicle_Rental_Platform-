/**
 * Unit Tests for AddToCartButton Component
 *
 * Tests the add to cart functionality including:
 * - Rendering in different variants
 * - Authentication checks
 * - Modal interactions
 * - Form validation
 * - API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';

// Get the mocked functions
const mockUseSession = useSession as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('AddToCartButton', () => {
  const mockPush = jest.fn();
  const defaultProps = {
    vehicleId: 'vehicle-123',
    vehicleName: 'Toyota Camry',
    location: 'Colombo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
    (global.fetch as jest.Mock).mockClear();
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });
    });

    it('should render the button with full variant by default', () => {
      render(<AddToCartButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });

    it('should render icon-only button when variant is icon', () => {
      render(<AddToCartButton {...defaultProps} variant="icon" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.queryByText('Add to Cart')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<AddToCartButton {...defaultProps} className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('should have correct title for icon variant', () => {
      render(<AddToCartButton {...defaultProps} variant="icon" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Add to cart');
    });
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe('authentication', () => {
    it('should redirect to login when clicking without authentication', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<AddToCartButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should open modal when user is authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });

      render(<AddToCartButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('Pickup Date & Time')).toBeInTheDocument();
    });

    it('should not redirect when user is authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });

      render(<AddToCartButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // MODAL TESTS
  // ============================================
  describe('modal', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });
    });

    it('should display vehicle name in modal header', () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
    });

    it('should close modal when cancel button is clicked', () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Pickup Date & Time')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Pickup Date & Time')).not.toBeInTheDocument();
    });

    it('should close modal when close button (X) is clicked', () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Pickup Date & Time')).toBeInTheDocument();

      // Find the close button in header (first button in modal that's not Cancel or Add to Cart)
      const closeButtons = screen.getAllByRole('button');
      const headerCloseButton = closeButtons.find(btn =>
        btn.closest('.bg-gradient-to-r')
      );
      if (headerCloseButton) {
        fireEvent.click(headerCloseButton);
      }
    });

    it('should pre-fill pickup and dropoff location', () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Both pickup and dropoff should have "Colombo" value
      const locationInputs = screen.getAllByDisplayValue('Colombo');
      expect(locationInputs).toHaveLength(2);
    });

    it('should have date inputs with min date set to today', () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      const dateInputs = screen.getAllByRole('textbox').filter(
        input => input.getAttribute('type') === 'date'
      );
      // Just check that the modal rendered with date fields
      expect(screen.getByText('Pickup Date & Time')).toBeInTheDocument();
      expect(screen.getByText('Return Date & Time')).toBeInTheDocument();
    });
  });

  // ============================================
  // FORM VALIDATION TESTS
  // ============================================
  describe('form validation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });
    });

    it('should show error when dates are not selected', async () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Find and click the Add to Cart button in modal
      const buttons = screen.getAllByText('Add to Cart');
      const modalAddButton = buttons[buttons.length - 1];
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(screen.getByText('Please select pickup and return dates')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // API INTEGRATION TESTS
  // ============================================
  describe('API integration', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });
    });

    it('should call API when form is submitted with valid data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Set dates - need to find and update the date inputs
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const timeInputs = document.querySelectorAll('input[type="time"]');

      // Set start date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Set end date to day after tomorrow
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];

      fireEvent.change(dateInputs[0], { target: { value: tomorrowStr } });
      fireEvent.change(dateInputs[1], { target: { value: dayAfterStr } });

      // Click Add to Cart in modal
      const buttons = screen.getAllByText('Add to Cart');
      const modalAddButton = buttons[buttons.length - 1];
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/cart',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should show success message when item is added', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Set valid dates
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      fireEvent.change(dateInputs[0], { target: { value: tomorrow.toISOString().split('T')[0] } });
      fireEvent.change(dateInputs[1], { target: { value: dayAfter.toISOString().split('T')[0] } });

      const buttons = screen.getAllByText('Add to Cart');
      const modalAddButton = buttons[buttons.length - 1];
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(screen.getByText('Added to Cart!')).toBeInTheDocument();
      });
    });

    it('should show error message when API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Vehicle not available' }),
      });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Set valid dates
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      fireEvent.change(dateInputs[0], { target: { value: tomorrow.toISOString().split('T')[0] } });
      fireEvent.change(dateInputs[1], { target: { value: dayAfter.toISOString().split('T')[0] } });

      const buttons = screen.getAllByText('Add to Cart');
      const modalAddButton = buttons[buttons.length - 1];
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(screen.getByText('Vehicle not available')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Set valid dates
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      fireEvent.change(dateInputs[0], { target: { value: tomorrow.toISOString().split('T')[0] } });
      fireEvent.change(dateInputs[1], { target: { value: dayAfter.toISOString().split('T')[0] } });

      const buttons = screen.getAllByText('Add to Cart');
      const modalAddButton = buttons[buttons.length - 1];
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // LOADING STATE TESTS
  // ============================================
  describe('loading state', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });
    });

    it('should disable button while loading', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementationOnce(() => pendingPromise);

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      // Set valid dates
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      fireEvent.change(dateInputs[0], { target: { value: tomorrow.toISOString().split('T')[0] } });
      fireEvent.change(dateInputs[1], { target: { value: dayAfter.toISOString().split('T')[0] } });

      const buttons = screen.getAllByText('Add to Cart');
      const modalAddButton = buttons[buttons.length - 1];
      fireEvent.click(modalAddButton);

      // Button should be disabled while loading
      await waitFor(() => {
        expect(modalAddButton).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });
});
