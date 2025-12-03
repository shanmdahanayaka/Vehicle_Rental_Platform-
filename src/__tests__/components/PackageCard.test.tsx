/**
 * Unit Tests for PackageCard Component
 *
 * Tests the package card display including:
 * - Rendering package information
 * - Price display logic
 * - Duration display logic
 * - Type badges and colors
 * - Discount badges
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PackageCard from '@/components/PackageCard';

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="package-link">
      {children}
    </a>
  ),
}));

describe('PackageCard', () => {
  const defaultProps = {
    id: 'package-123',
    name: 'Daily Rental Package',
    description: 'Perfect for day trips and short rentals',
    type: 'DAILY',
    basePrice: null,
    pricePerDay: 5000,
    pricePerHour: null,
    discount: null,
    minDuration: 1,
    maxDuration: 7,
    icon: null,
  };

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('should render the package card', () => {
      render(<PackageCard {...defaultProps} />);

      expect(screen.getByText('Daily Rental Package')).toBeInTheDocument();
    });

    it('should render package name', () => {
      render(<PackageCard {...defaultProps} />);

      expect(screen.getByText('Daily Rental Package')).toBeInTheDocument();
    });

    it('should render package description', () => {
      render(<PackageCard {...defaultProps} />);

      expect(screen.getByText('Perfect for day trips and short rentals')).toBeInTheDocument();
    });

    it('should not render description when null', () => {
      render(<PackageCard {...defaultProps} description={null} />);

      expect(screen.queryByText('Perfect for day trips and short rentals')).not.toBeInTheDocument();
    });

    it('should render View Details link', () => {
      render(<PackageCard {...defaultProps} />);

      expect(screen.getByText('View Details')).toBeInTheDocument();
      const link = screen.getByTestId('package-link');
      expect(link).toHaveAttribute('href', '/packages/package-123');
    });
  });

  // ============================================
  // TYPE BADGE TESTS
  // ============================================
  describe('type badges', () => {
    it('should render Daily Rental type', () => {
      render(<PackageCard {...defaultProps} type="DAILY" />);

      expect(screen.getByText('Daily Rental')).toBeInTheDocument();
    });

    it('should render Weekly Rental type', () => {
      render(<PackageCard {...defaultProps} type="WEEKLY" />);

      expect(screen.getByText('Weekly Rental')).toBeInTheDocument();
    });

    it('should render Monthly Rental type', () => {
      render(<PackageCard {...defaultProps} type="MONTHLY" />);

      expect(screen.getByText('Monthly Rental')).toBeInTheDocument();
    });

    it('should render Airport Pickup type', () => {
      render(<PackageCard {...defaultProps} type="AIRPORT_PICKUP" />);

      expect(screen.getByText('Airport Pickup')).toBeInTheDocument();
    });

    it('should render Airport Drop type', () => {
      render(<PackageCard {...defaultProps} type="AIRPORT_DROP" />);

      expect(screen.getByText('Airport Drop')).toBeInTheDocument();
    });

    it('should render Airport Round Trip type', () => {
      render(<PackageCard {...defaultProps} type="AIRPORT_ROUND" />);

      expect(screen.getByText('Airport Round Trip')).toBeInTheDocument();
    });

    it('should render Hourly Rental type', () => {
      render(<PackageCard {...defaultProps} type="HOURLY" />);

      expect(screen.getByText('Hourly Rental')).toBeInTheDocument();
    });

    it('should render Custom Package type', () => {
      render(<PackageCard {...defaultProps} type="CUSTOM" />);

      expect(screen.getByText('Custom Package')).toBeInTheDocument();
    });

    it('should handle unknown type', () => {
      render(<PackageCard {...defaultProps} type="UNKNOWN" />);

      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });
  });

  // ============================================
  // PRICE DISPLAY TESTS
  // ============================================
  describe('price display', () => {
    it('should display base price when available', () => {
      render(<PackageCard {...defaultProps} basePrice={10000} pricePerDay={null} />);

      // Should show price without suffix
      expect(screen.queryByText('/day')).not.toBeInTheDocument();
      expect(screen.queryByText('/hour')).not.toBeInTheDocument();
    });

    it('should display price per day with /day suffix', () => {
      render(<PackageCard {...defaultProps} pricePerDay={5000} />);

      expect(screen.getByText('/day')).toBeInTheDocument();
    });

    it('should display price per hour with /hour suffix', () => {
      render(<PackageCard {...defaultProps} pricePerDay={null} pricePerHour={500} />);

      expect(screen.getByText('/hour')).toBeInTheDocument();
    });

    it('should display custom pricing when no price is set', () => {
      render(<PackageCard {...defaultProps} basePrice={null} pricePerDay={null} pricePerHour={null} />);

      expect(screen.getByText('Custom pricing')).toBeInTheDocument();
    });

    it('should prioritize base price over per day/hour', () => {
      render(<PackageCard {...defaultProps} basePrice={10000} pricePerDay={5000} pricePerHour={500} />);

      // Should not show suffix since base price is used
      expect(screen.queryByText('/day')).not.toBeInTheDocument();
      expect(screen.queryByText('/hour')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // DISCOUNT BADGE TESTS
  // ============================================
  describe('discount badge', () => {
    it('should display discount badge when discount > 0', () => {
      render(<PackageCard {...defaultProps} discount={20} />);

      expect(screen.getByText('20% OFF')).toBeInTheDocument();
    });

    it('should not display discount badge when discount is 0', () => {
      render(<PackageCard {...defaultProps} discount={0} />);

      expect(screen.queryByText('% OFF')).not.toBeInTheDocument();
    });

    it('should not display discount badge when discount is null', () => {
      render(<PackageCard {...defaultProps} discount={null} />);

      expect(screen.queryByText('% OFF')).not.toBeInTheDocument();
    });

    it('should display different discount values', () => {
      render(<PackageCard {...defaultProps} discount={15} />);

      expect(screen.getByText('15% OFF')).toBeInTheDocument();
    });
  });

  // ============================================
  // DURATION DISPLAY TESTS
  // ============================================
  describe('duration display', () => {
    it('should display min-max duration range', () => {
      render(<PackageCard {...defaultProps} minDuration={1} maxDuration={7} />);

      expect(screen.getByText('1 - 7 days')).toBeInTheDocument();
    });

    it('should display min duration only', () => {
      render(<PackageCard {...defaultProps} minDuration={3} maxDuration={null} />);

      expect(screen.getByText('Min 3 days')).toBeInTheDocument();
    });

    it('should display max duration only', () => {
      render(<PackageCard {...defaultProps} minDuration={null} maxDuration={14} />);

      expect(screen.getByText('Max 14 days')).toBeInTheDocument();
    });

    it('should display hours for HOURLY type', () => {
      render(<PackageCard {...defaultProps} type="HOURLY" minDuration={2} maxDuration={8} />);

      expect(screen.getByText('2 - 8 hours')).toBeInTheDocument();
    });

    it('should not display duration when both null', () => {
      render(<PackageCard {...defaultProps} minDuration={null} maxDuration={null} />);

      expect(screen.queryByText(/days/)).not.toBeInTheDocument();
      expect(screen.queryByText(/hours/)).not.toBeInTheDocument();
    });
  });

  // ============================================
  // VEHICLE COUNT TESTS
  // ============================================
  describe('vehicle count', () => {
    it('should display vehicle count when > 0', () => {
      render(<PackageCard {...defaultProps} vehicleCount={15} />);

      expect(screen.getByText('15 vehicles')).toBeInTheDocument();
    });

    it('should not display vehicle count when 0', () => {
      render(<PackageCard {...defaultProps} vehicleCount={0} />);

      expect(screen.queryByText('vehicles')).not.toBeInTheDocument();
    });

    it('should not display vehicle count when undefined', () => {
      render(<PackageCard {...defaultProps} />);

      expect(screen.queryByText('vehicles')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // DIFFERENT PACKAGE TYPES TESTS
  // ============================================
  describe('different package types', () => {
    it('should render weekly package correctly', () => {
      const weeklyProps = {
        ...defaultProps,
        id: 'weekly-1',
        name: 'Weekly Special',
        type: 'WEEKLY',
        pricePerDay: 4000,
        discount: 15,
        minDuration: 7,
        maxDuration: 30,
      };

      render(<PackageCard {...weeklyProps} />);

      expect(screen.getByText('Weekly Special')).toBeInTheDocument();
      expect(screen.getByText('Weekly Rental')).toBeInTheDocument();
      expect(screen.getByText('15% OFF')).toBeInTheDocument();
      expect(screen.getByText('7 - 30 days')).toBeInTheDocument();
    });

    it('should render airport package correctly', () => {
      const airportProps = {
        ...defaultProps,
        id: 'airport-1',
        name: 'Airport Transfer',
        type: 'AIRPORT_PICKUP',
        basePrice: 3500,
        pricePerDay: null,
        minDuration: null,
        maxDuration: null,
      };

      render(<PackageCard {...airportProps} />);

      expect(screen.getByText('Airport Transfer')).toBeInTheDocument();
      expect(screen.getByText('Airport Pickup')).toBeInTheDocument();
    });

    it('should render hourly package correctly', () => {
      const hourlyProps = {
        ...defaultProps,
        id: 'hourly-1',
        name: 'Hourly Deal',
        type: 'HOURLY',
        basePrice: null,
        pricePerDay: null,
        pricePerHour: 800,
        minDuration: 1,
        maxDuration: 12,
      };

      render(<PackageCard {...hourlyProps} />);

      expect(screen.getByText('Hourly Deal')).toBeInTheDocument();
      expect(screen.getByText('Hourly Rental')).toBeInTheDocument();
      expect(screen.getByText('/hour')).toBeInTheDocument();
      expect(screen.getByText('1 - 12 hours')).toBeInTheDocument();
    });
  });
});
