/**
 * Unit Tests for VehicleSortDropdown Component
 *
 * Tests the vehicle sorting dropdown including:
 * - Rendering
 * - Sort options
 * - URL parameter updates
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import VehicleSortDropdown from '@/components/VehicleSortDropdown';

// Get the mocked functions
const mockUseRouter = useRouter as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

describe('VehicleSortDropdown', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('should render the sort dropdown', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render the label', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      expect(screen.getByText('Sort by:')).toBeInTheDocument();
    });

    it('should render select element', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('name', 'sort');
    });
  });

  // ============================================
  // SORT OPTIONS TESTS
  // ============================================
  describe('sort options', () => {
    it('should have Newest First option', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      expect(screen.getByRole('option', { name: 'Newest First' })).toBeInTheDocument();
    });

    it('should have Price Low to High option', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      expect(screen.getByRole('option', { name: 'Price: Low to High' })).toBeInTheDocument();
    });

    it('should have Price High to Low option', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      expect(screen.getByRole('option', { name: 'Price: High to Low' })).toBeInTheDocument();
    });

    it('should have Most Popular option', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      expect(screen.getByRole('option', { name: 'Most Popular' })).toBeInTheDocument();
    });

    it('should have correct values for all options', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      expect(screen.getByRole('option', { name: 'Newest First' })).toHaveValue('newest');
      expect(screen.getByRole('option', { name: 'Price: Low to High' })).toHaveValue('price_asc');
      expect(screen.getByRole('option', { name: 'Price: High to Low' })).toHaveValue('price_desc');
      expect(screen.getByRole('option', { name: 'Most Popular' })).toHaveValue('popular');
    });
  });

  // ============================================
  // CURRENT SORT VALUE TESTS
  // ============================================
  describe('current sort value', () => {
    it('should show newest as selected when currentSort is newest', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('newest');
    });

    it('should show price_asc as selected when currentSort is price_asc', () => {
      render(<VehicleSortDropdown currentSort="price_asc" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('price_asc');
    });

    it('should show price_desc as selected when currentSort is price_desc', () => {
      render(<VehicleSortDropdown currentSort="price_desc" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('price_desc');
    });

    it('should show popular as selected when currentSort is popular', () => {
      render(<VehicleSortDropdown currentSort="popular" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('popular');
    });
  });

  // ============================================
  // SORT CHANGE TESTS
  // ============================================
  describe('sort change', () => {
    it('should update URL when sort changes', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'price_asc' } });

      expect(mockPush).toHaveBeenCalledWith('/vehicles?sort=price_asc');
    });

    it('should preserve existing search params', () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams('type=SUV&brand=Toyota'));

      render(<VehicleSortDropdown currentSort="newest" />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'price_desc' } });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('sort=price_desc'));
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('type=SUV'));
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('brand=Toyota'));
    });

    it('should change to popular sort', () => {
      render(<VehicleSortDropdown currentSort="newest" />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'popular' } });

      expect(mockPush).toHaveBeenCalledWith('/vehicles?sort=popular');
    });

    it('should change back to newest', () => {
      render(<VehicleSortDropdown currentSort="price_asc" />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'newest' } });

      expect(mockPush).toHaveBeenCalledWith('/vehicles?sort=newest');
    });
  });
});
