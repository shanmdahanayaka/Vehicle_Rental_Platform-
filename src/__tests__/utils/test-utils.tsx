import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { useSession } from 'next-auth/react';

// Mock session data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER' as const,
  image: null,
};

export const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN' as const,
  image: null,
};

export const mockSuperAdminUser = {
  id: 'super-admin-123',
  email: 'superadmin@example.com',
  name: 'Super Admin',
  role: 'SUPER_ADMIN' as const,
  image: null,
};

export const mockManagerUser = {
  id: 'manager-123',
  email: 'manager@example.com',
  name: 'Manager User',
  role: 'MANAGER' as const,
  image: null,
};

// Mock session
export const mockSession = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockAdminSession = {
  user: mockAdminUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Test Provider wrapper
interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: AllProvidersProps) => {
  return (
    <SessionProvider session={null}>
      {children}
    </SessionProvider>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllProviders, ...options });

// Helper to mock authenticated session
export function mockAuthenticatedSession(user = mockUser) {
  const mockedUseSession = useSession as jest.Mock;
  mockedUseSession.mockReturnValue({
    data: { user, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
    status: 'authenticated',
  });
}

// Helper to mock unauthenticated session
export function mockUnauthenticatedSession() {
  const mockedUseSession = useSession as jest.Mock;
  mockedUseSession.mockReturnValue({
    data: null,
    status: 'unauthenticated',
  });
}

// Helper to mock loading session
export function mockLoadingSession() {
  const mockedUseSession = useSession as jest.Mock;
  mockedUseSession.mockReturnValue({
    data: null,
    status: 'loading',
  });
}

// Mock vehicle data
export const mockVehicle = {
  id: 'vehicle-123',
  name: 'Toyota Camry',
  type: 'SEDAN',
  brand: 'Toyota',
  model: 'Camry',
  year: 2023,
  seats: 5,
  transmission: 'AUTOMATIC',
  fuelType: 'PETROL',
  pricePerDay: 5000,
  isAvailable: true,
  images: JSON.stringify(['/images/camry.jpg']),
  description: 'A comfortable sedan',
  features: ['AC', 'GPS', 'Bluetooth'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock booking data
export const mockBooking = {
  id: 'booking-123',
  userId: mockUser.id,
  vehicleId: mockVehicle.id,
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-20'),
  status: 'PENDING',
  totalPrice: 25000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock cart item data
export const mockCartItem = {
  id: 'cart-item-123',
  userId: mockUser.id,
  vehicleId: mockVehicle.id,
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-20'),
  vehicle: mockVehicle,
};

// Mock notification data
export const mockNotification = {
  id: 'notification-123',
  userId: mockUser.id,
  title: 'Booking Confirmed',
  message: 'Your booking has been confirmed',
  type: 'BOOKING',
  read: false,
  createdAt: new Date(),
};

// Mock API response helpers
export function createMockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

export function mockFetch(response: unknown, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(response, status));
}

export function mockFetchError(message: string, status = 500) {
  (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ error: message }, status));
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
