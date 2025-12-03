/**
 * Unit Tests for FavoriteButton Component
 *
 * Tests the favorite button functionality including:
 * - Rendering in different states
 * - Authentication checks
 * - Toggle favorite functionality
 * - API integration
 * - Loading and animation states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FavoriteButton from '@/components/FavoriteButton';

// Get the mocked functions
const mockUseSession = useSession as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('FavoriteButton', () => {
  const mockPush = jest.fn();

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

    it('should render the favorite button', () => {
      render(<FavoriteButton vehicleId="vehicle-123" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with default size (md)', () => {
      render(<FavoriteButton vehicleId="vehicle-123" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-10');
      expect(button.className).toContain('h-10');
    });

    it('should render with small size', () => {
      render(<FavoriteButton vehicleId="vehicle-123" size="sm" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-8');
      expect(button.className).toContain('h-8');
    });

    it('should render with large size', () => {
      render(<FavoriteButton vehicleId="vehicle-123" size="lg" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-12');
      expect(button.className).toContain('h-12');
    });

    it('should apply custom className', () => {
      render(<FavoriteButton vehicleId="vehicle-123" className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('should not show text by default', () => {
      render(<FavoriteButton vehicleId="vehicle-123" />);

      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('should show text when showText is true', () => {
      render(<FavoriteButton vehicleId="vehicle-123" showText={true} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should have correct title when not favorited', () => {
      render(<FavoriteButton vehicleId="vehicle-123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Add to favorites');
    });
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe('authentication', () => {
    it('should redirect to login when clicking without authentication', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should not redirect when user is authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });

      // Mock the fetch for checking favorite status
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isFavorited: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // FAVORITE STATUS CHECK TESTS
  // ============================================
  describe('favorite status check', () => {
    it('should check favorite status when user is logged in', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: true }),
      });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/favorites/check?vehicleId=vehicle-123'
        );
      });
    });

    it('should not check favorite status when user is not logged in', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      // Fetch should not be called for unauthenticated users
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should show saved state when vehicle is favorited', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: true }),
      });

      render(<FavoriteButton vehicleId="vehicle-123" showText={true} />);

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });

    it('should handle API error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  // ============================================
  // TOGGLE FAVORITE TESTS
  // ============================================
  describe('toggle favorite', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });
    });

    it('should add to favorites when not favorited', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isFavorited: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/favorites',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId: 'vehicle-123' }),
          })
        );
      });
    });

    it('should remove from favorites when already favorited', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isFavorited: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/favorites?vehicleId=vehicle-123',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    it('should prevent event propagation when clicking', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: false }),
      });

      const handleParentClick = jest.fn();

      render(
        <div onClick={handleParentClick}>
          <FavoriteButton vehicleId="vehicle-123" />
        </div>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleParentClick).not.toHaveBeenCalled();
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
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isFavorited: false }),
        })
        .mockImplementationOnce(() => pendingPromise);

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Button should be disabled while loading
      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  // ============================================
  // VISUAL STATE TESTS
  // ============================================
  describe('visual states', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', name: 'Test User' },
        },
        status: 'authenticated',
      });
    });

    it('should have correct styles when not favorited', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: false }),
      });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button.className).toContain('text-slate-400');
      });
    });

    it('should have correct styles when favorited', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: true }),
      });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button.className).toContain('text-red-500');
        expect(button.className).toContain('bg-red-50');
      });
    });

    it('should update title when favorited', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: true }),
      });

      render(<FavoriteButton vehicleId="vehicle-123" />);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('title', 'Remove from favorites');
      });
    });
  });
});
