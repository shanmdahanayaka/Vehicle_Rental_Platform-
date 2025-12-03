/**
 * Unit Tests for GuidedTour tourSteps configuration
 *
 * Tests the tour step definitions including:
 * - Admin tour steps
 * - User tour steps
 * - getTourSteps function
 * - Step structure validation
 */

import {
  adminTourSteps,
  userTourSteps,
  getTourSteps,
} from '@/components/GuidedTour/tourSteps';

describe('GuidedTour tourSteps', () => {
  // ============================================
  // ADMIN TOUR STEPS TESTS
  // ============================================
  describe('adminTourSteps', () => {
    it('should have correct number of steps', () => {
      expect(adminTourSteps.length).toBe(12);
    });

    it('should start with welcome step', () => {
      expect(adminTourSteps[0].id).toBe('welcome');
      expect(adminTourSteps[0].title).toContain('Welcome');
    });

    it('should end with complete step', () => {
      const lastStep = adminTourSteps[adminTourSteps.length - 1];
      expect(lastStep.id).toBe('complete');
      expect(lastStep.title).toContain("You're All Set");
    });

    it('should have dashboard-stats step', () => {
      const step = adminTourSteps.find((s) => s.id === 'dashboard-stats');
      expect(step).toBeDefined();
      expect(step?.title).toContain('Statistics');
    });

    it('should have analytics step', () => {
      const step = adminTourSteps.find((s) => s.id === 'analytics');
      expect(step).toBeDefined();
      expect(step?.title).toContain('Analytics');
    });

    it('should have navigation menu steps', () => {
      const navSteps = [
        'sidebar-nav',
        'bookings-menu',
        'vehicles-menu',
        'invoices-menu',
        'packages-menu',
        'permissions-menu',
      ];

      navSteps.forEach((stepId) => {
        const step = adminTourSteps.find((s) => s.id === stepId);
        expect(step).toBeDefined();
      });
    });

    it('should have valid structure for all steps', () => {
      adminTourSteps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(typeof step.id).toBe('string');
        expect(step.title).toBeDefined();
        expect(typeof step.title).toBe('string');
        expect(step.content).toBeDefined();
        expect(typeof step.content).toBe('string');
      });
    });

    it('should have center position for welcome and complete steps', () => {
      expect(adminTourSteps[0].position).toBe('center');
      expect(adminTourSteps[adminTourSteps.length - 1].position).toBe('center');
    });

    it('should have spotlight false for welcome and complete steps', () => {
      expect(adminTourSteps[0].spotlight).toBe(false);
      expect(adminTourSteps[adminTourSteps.length - 1].spotlight).toBe(false);
    });

    it('should have targets for navigation steps', () => {
      const targetSteps = adminTourSteps.filter(
        (step) => step.id !== 'welcome' && step.id !== 'complete'
      );

      targetSteps.forEach((step) => {
        expect(step.target).toBeDefined();
        expect(step.target).toContain('[data-tour=');
      });
    });
  });

  // ============================================
  // USER TOUR STEPS TESTS
  // ============================================
  describe('userTourSteps', () => {
    it('should have correct number of steps', () => {
      expect(userTourSteps.length).toBe(11);
    });

    it('should start with welcome step', () => {
      expect(userTourSteps[0].id).toBe('welcome');
      expect(userTourSteps[0].title).toContain('Welcome');
    });

    it('should end with complete step', () => {
      const lastStep = userTourSteps[userTourSteps.length - 1];
      expect(lastStep.id).toBe('complete');
      expect(lastStep.title).toContain('Ready to Roll');
    });

    it('should have browse-vehicles step', () => {
      const step = userTourSteps.find((s) => s.id === 'browse-vehicles');
      expect(step).toBeDefined();
      expect(step?.title).toContain('Vehicles');
    });

    it('should have search step', () => {
      const step = userTourSteps.find((s) => s.id === 'search');
      expect(step).toBeDefined();
      expect(step?.title).toContain('Search');
    });

    it('should have user feature steps', () => {
      const userSteps = [
        'packages',
        'favorites',
        'cart',
        'bookings',
        'notifications',
        'profile',
        'chat',
      ];

      userSteps.forEach((stepId) => {
        const step = userTourSteps.find((s) => s.id === stepId);
        expect(step).toBeDefined();
      });
    });

    it('should have valid structure for all steps', () => {
      userTourSteps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(typeof step.id).toBe('string');
        expect(step.title).toBeDefined();
        expect(typeof step.title).toBe('string');
        expect(step.content).toBeDefined();
        expect(typeof step.content).toBe('string');
      });
    });

    it('should have center position for welcome and complete steps', () => {
      expect(userTourSteps[0].position).toBe('center');
      expect(userTourSteps[userTourSteps.length - 1].position).toBe('center');
    });

    it('should have targets for navigation steps', () => {
      const targetSteps = userTourSteps.filter(
        (step) => step.id !== 'welcome' && step.id !== 'complete'
      );

      targetSteps.forEach((step) => {
        expect(step.target).toBeDefined();
        expect(step.target).toContain('[data-tour=');
      });
    });
  });

  // ============================================
  // getTourSteps() FUNCTION TESTS
  // ============================================
  describe('getTourSteps()', () => {
    it('should return admin steps for ADMIN role', () => {
      const steps = getTourSteps('ADMIN');
      expect(steps).toBe(adminTourSteps);
    });

    it('should return admin steps for SUPER_ADMIN role', () => {
      const steps = getTourSteps('SUPER_ADMIN');
      expect(steps).toBe(adminTourSteps);
    });

    it('should return admin steps for MANAGER role', () => {
      const steps = getTourSteps('MANAGER');
      expect(steps).toBe(adminTourSteps);
    });

    it('should return user steps for USER role', () => {
      const steps = getTourSteps('USER');
      expect(steps).toBe(userTourSteps);
    });

    it('should return user steps for undefined role', () => {
      const steps = getTourSteps(undefined);
      expect(steps).toBe(userTourSteps);
    });

    it('should return user steps for unknown role', () => {
      const steps = getTourSteps('UNKNOWN');
      expect(steps).toBe(userTourSteps);
    });

    it('should return user steps for empty string role', () => {
      const steps = getTourSteps('');
      expect(steps).toBe(userTourSteps);
    });
  });

  // ============================================
  // STEP IDS UNIQUENESS TESTS
  // ============================================
  describe('step IDs uniqueness', () => {
    it('should have unique IDs in admin steps', () => {
      const ids = adminTourSteps.map((step) => step.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have unique IDs in user steps', () => {
      const ids = userTourSteps.map((step) => step.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  // ============================================
  // POSITION VALUES TESTS
  // ============================================
  describe('position values', () => {
    const validPositions = ['top', 'bottom', 'left', 'right', 'center', undefined];

    it('should have valid positions in admin steps', () => {
      adminTourSteps.forEach((step) => {
        expect(validPositions).toContain(step.position);
      });
    });

    it('should have valid positions in user steps', () => {
      userTourSteps.forEach((step) => {
        expect(validPositions).toContain(step.position);
      });
    });
  });

  // ============================================
  // CONTENT QUALITY TESTS
  // ============================================
  describe('content quality', () => {
    it('should have non-empty titles in admin steps', () => {
      adminTourSteps.forEach((step) => {
        expect(step.title.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty content in admin steps', () => {
      adminTourSteps.forEach((step) => {
        expect(step.content.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty titles in user steps', () => {
      userTourSteps.forEach((step) => {
        expect(step.title.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty content in user steps', () => {
      userTourSteps.forEach((step) => {
        expect(step.content.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive content (min 20 chars)', () => {
      [...adminTourSteps, ...userTourSteps].forEach((step) => {
        expect(step.content.length).toBeGreaterThan(20);
      });
    });
  });
});
