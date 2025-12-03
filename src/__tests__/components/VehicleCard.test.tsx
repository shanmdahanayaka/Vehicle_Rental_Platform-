/**
 * Unit Tests for VehicleCard Component
 *
 * Tests the vehicle card display including:
 * - Rendering vehicle information
 * - Image handling
 * - Type badges
 * - Rating display
 * - Price formatting
 * - Links and actions
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import VehicleCard from '@/components/VehicleCard';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; fill?: boolean; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} data-testid="vehicle-image" />
  ),
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="vehicle-link">
      {children}
    </a>
  ),
}));

describe('VehicleCard', () => {
  const defaultProps = {
    id: 'vehicle-123',
    name: 'Toyota Camry',
    brand: 'Toyota',
    model: 'Camry',
    year: 2023,
    type: 'CAR',
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    seats: 5,
    pricePerDay: 5000,
    images: JSON.stringify(['/images/camry.jpg']),
  };

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('should render the vehicle card', () => {
      render(<VehicleCard {...defaultProps} />);

      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('Toyota')).toBeInTheDocument();
    });

    it('should render vehicle name and brand', () => {
      render(<VehicleCard {...defaultProps} />);

      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('Toyota')).toBeInTheDocument();
    });

    it('should render transmission info', () => {
      render(<VehicleCard {...defaultProps} />);

      expect(screen.getByText('Auto')).toBeInTheDocument();
    });

    it('should render manual transmission correctly', () => {
      render(<VehicleCard {...defaultProps} transmission="MANUAL" />);

      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('should render fuel type', () => {
      render(<VehicleCard {...defaultProps} />);

      expect(screen.getByText('Petrol')).toBeInTheDocument();
    });

    it('should render seat count', () => {
      render(<VehicleCard {...defaultProps} />);

      expect(screen.getByText('5 Seats')).toBeInTheDocument();
    });

    it('should render price per day', () => {
      render(<VehicleCard {...defaultProps} />);

      expect(screen.getByText('/day')).toBeInTheDocument();
    });

    it('should render View button with link', () => {
      render(<VehicleCard {...defaultProps} />);

      expect(screen.getByText('View')).toBeInTheDocument();
      const link = screen.getByTestId('vehicle-link');
      expect(link).toHaveAttribute('href', '/vehicles/vehicle-123');
    });
  });

  // ============================================
  // IMAGE HANDLING TESTS
  // ============================================
  describe('image handling', () => {
    it('should render vehicle image when available', () => {
      render(<VehicleCard {...defaultProps} />);

      const image = screen.getByTestId('vehicle-image');
      expect(image).toHaveAttribute('src', '/images/camry.jpg');
      expect(image).toHaveAttribute('alt', 'Toyota Camry');
    });

    it('should handle multiple images and show first one', () => {
      const propsWithMultipleImages = {
        ...defaultProps,
        images: JSON.stringify(['/images/car1.jpg', '/images/car2.jpg', '/images/car3.jpg']),
      };

      render(<VehicleCard {...propsWithMultipleImages} />);

      const image = screen.getByTestId('vehicle-image');
      expect(image).toHaveAttribute('src', '/images/car1.jpg');
    });

    it('should show placeholder when no images', () => {
      const propsWithNoImages = {
        ...defaultProps,
        images: JSON.stringify([]),
      };

      render(<VehicleCard {...propsWithNoImages} />);

      expect(screen.getByText('No image')).toBeInTheDocument();
    });

    it('should handle invalid JSON for images', () => {
      const propsWithInvalidJson = {
        ...defaultProps,
        images: 'not-valid-json',
      };

      render(<VehicleCard {...propsWithInvalidJson} />);

      // Should not crash and show placeholder
      expect(screen.getByText('No image')).toBeInTheDocument();
    });

    it('should handle URL string for images', () => {
      const propsWithUrlString = {
        ...defaultProps,
        images: 'http://example.com/car.jpg',
      };

      render(<VehicleCard {...propsWithUrlString} />);

      const image = screen.getByTestId('vehicle-image');
      expect(image).toHaveAttribute('src', 'http://example.com/car.jpg');
    });

    it('should handle comma-separated URLs', () => {
      const propsWithCommaUrls = {
        ...defaultProps,
        images: 'http://example.com/car1.jpg, http://example.com/car2.jpg',
      };

      render(<VehicleCard {...propsWithCommaUrls} />);

      const image = screen.getByTestId('vehicle-image');
      expect(image).toHaveAttribute('src', 'http://example.com/car1.jpg');
    });
  });

  // ============================================
  // TYPE BADGE TESTS
  // ============================================
  describe('type badges', () => {
    it('should render CAR type badge', () => {
      render(<VehicleCard {...defaultProps} type="CAR" />);

      expect(screen.getByText('CAR')).toBeInTheDocument();
    });

    it('should render SUV type badge', () => {
      render(<VehicleCard {...defaultProps} type="SUV" />);

      expect(screen.getByText('SUV')).toBeInTheDocument();
    });

    it('should render VAN type badge', () => {
      render(<VehicleCard {...defaultProps} type="VAN" />);

      expect(screen.getByText('VAN')).toBeInTheDocument();
    });

    it('should render LUXURY type badge', () => {
      render(<VehicleCard {...defaultProps} type="LUXURY" />);

      expect(screen.getByText('LUXURY')).toBeInTheDocument();
    });

    it('should render MOTORCYCLE type badge', () => {
      render(<VehicleCard {...defaultProps} type="MOTORCYCLE" />);

      expect(screen.getByText('MOTORCYCLE')).toBeInTheDocument();
    });

    it('should render TRUCK type badge', () => {
      render(<VehicleCard {...defaultProps} type="TRUCK" />);

      expect(screen.getByText('TRUCK')).toBeInTheDocument();
    });
  });

  // ============================================
  // RATING DISPLAY TESTS
  // ============================================
  describe('rating display', () => {
    it('should not show rating when reviewCount is 0', () => {
      render(<VehicleCard {...defaultProps} avgRating={4.5} reviewCount={0} />);

      expect(screen.queryByText('4.5')).not.toBeInTheDocument();
    });

    it('should show rating when reviewCount > 0', () => {
      render(<VehicleCard {...defaultProps} avgRating={4.5} reviewCount={10} />);

      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText('(10)')).toBeInTheDocument();
    });

    it('should format rating to one decimal place', () => {
      render(<VehicleCard {...defaultProps} avgRating={4.567} reviewCount={5} />);

      expect(screen.getByText('4.6')).toBeInTheDocument();
    });

    it('should show rating even with 1 review', () => {
      render(<VehicleCard {...defaultProps} avgRating={5} reviewCount={1} />);

      expect(screen.getByText('5.0')).toBeInTheDocument();
      expect(screen.getByText('(1)')).toBeInTheDocument();
    });
  });

  // ============================================
  // LOCATION DISPLAY TESTS
  // ============================================
  describe('location display', () => {
    it('should show location when provided', () => {
      render(<VehicleCard {...defaultProps} location="Colombo" />);

      expect(screen.getByText('Colombo')).toBeInTheDocument();
    });

    it('should not show location section when not provided', () => {
      render(<VehicleCard {...defaultProps} />);

      // The location icon should not be present if no location
      expect(screen.queryByText('Colombo')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // FUEL TYPE DISPLAY TESTS
  // ============================================
  describe('fuel type display', () => {
    it('should format PETROL correctly', () => {
      render(<VehicleCard {...defaultProps} fuelType="PETROL" />);

      expect(screen.getByText('Petrol')).toBeInTheDocument();
    });

    it('should format DIESEL correctly', () => {
      render(<VehicleCard {...defaultProps} fuelType="DIESEL" />);

      expect(screen.getByText('Diesel')).toBeInTheDocument();
    });

    it('should format ELECTRIC correctly', () => {
      render(<VehicleCard {...defaultProps} fuelType="ELECTRIC" />);

      expect(screen.getByText('Electric')).toBeInTheDocument();
    });

    it('should format HYBRID correctly', () => {
      render(<VehicleCard {...defaultProps} fuelType="HYBRID" />);

      expect(screen.getByText('Hybrid')).toBeInTheDocument();
    });
  });

  // ============================================
  // DIFFERENT VEHICLE DATA TESTS
  // ============================================
  describe('different vehicle data', () => {
    it('should render luxury vehicle correctly', () => {
      const luxuryProps = {
        ...defaultProps,
        id: 'luxury-1',
        name: 'Mercedes S-Class',
        brand: 'Mercedes-Benz',
        model: 'S-Class',
        type: 'LUXURY',
        transmission: 'AUTOMATIC',
        fuelType: 'PETROL',
        seats: 4,
        pricePerDay: 50000,
      };

      render(<VehicleCard {...luxuryProps} />);

      expect(screen.getByText('Mercedes S-Class')).toBeInTheDocument();
      expect(screen.getByText('Mercedes-Benz')).toBeInTheDocument();
      expect(screen.getByText('LUXURY')).toBeInTheDocument();
      expect(screen.getByText('4 Seats')).toBeInTheDocument();
    });

    it('should render motorcycle correctly', () => {
      const motorcycleProps = {
        ...defaultProps,
        id: 'bike-1',
        name: 'Honda CBR',
        brand: 'Honda',
        model: 'CBR 600',
        type: 'MOTORCYCLE',
        transmission: 'MANUAL',
        fuelType: 'PETROL',
        seats: 2,
        pricePerDay: 3000,
      };

      render(<VehicleCard {...motorcycleProps} />);

      expect(screen.getByText('Honda CBR')).toBeInTheDocument();
      expect(screen.getByText('MOTORCYCLE')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByText('2 Seats')).toBeInTheDocument();
    });

    it('should render electric vehicle correctly', () => {
      const evProps = {
        ...defaultProps,
        id: 'ev-1',
        name: 'Tesla Model 3',
        brand: 'Tesla',
        model: 'Model 3',
        type: 'CAR',
        transmission: 'AUTOMATIC',
        fuelType: 'ELECTRIC',
        seats: 5,
        pricePerDay: 15000,
      };

      render(<VehicleCard {...evProps} />);

      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
      expect(screen.getByText('Tesla')).toBeInTheDocument();
      expect(screen.getByText('Electric')).toBeInTheDocument();
    });
  });

  // ============================================
  // COMPONENT INTEGRATION TESTS
  // ============================================
  describe('component integration', () => {
    it('should render FavoriteButton component', () => {
      render(<VehicleCard {...defaultProps} />);

      // FavoriteButton should be present (check for its button role)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render AddToCartButton component', () => {
      render(<VehicleCard {...defaultProps} location="Colombo" />);

      // Check for cart-related elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
