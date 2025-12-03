/**
 * Unit Tests for src/lib/audit.ts
 *
 * Tests audit logging functionality including:
 * - formatAuditAction function
 * - getRequestInfo function
 * - Action type definitions
 */

import {
  formatAuditAction,
  getRequestInfo,
  AuditAction,
  AuditResource,
} from '@/lib/audit';

describe('lib/audit', () => {
  // ============================================
  // formatAuditAction() TESTS
  // ============================================
  describe('formatAuditAction()', () => {
    describe('user actions', () => {
      it('should format user.create', () => {
        expect(formatAuditAction('user.create')).toBe('Created user');
      });

      it('should format user.update', () => {
        expect(formatAuditAction('user.update')).toBe('Updated user');
      });

      it('should format user.delete', () => {
        expect(formatAuditAction('user.delete')).toBe('Deleted user');
      });

      it('should format user.suspend', () => {
        expect(formatAuditAction('user.suspend')).toBe('Suspended user');
      });

      it('should format user.activate', () => {
        expect(formatAuditAction('user.activate')).toBe('Activated user');
      });

      it('should format user.ban', () => {
        expect(formatAuditAction('user.ban')).toBe('Banned user');
      });

      it('should format user.role_change', () => {
        expect(formatAuditAction('user.role_change')).toBe('Changed user role');
      });

      it('should format user.login', () => {
        expect(formatAuditAction('user.login')).toBe('User logged in');
      });

      it('should format user.logout', () => {
        expect(formatAuditAction('user.logout')).toBe('User logged out');
      });
    });

    describe('vehicle actions', () => {
      it('should format vehicle.create', () => {
        expect(formatAuditAction('vehicle.create')).toBe('Created vehicle');
      });

      it('should format vehicle.update', () => {
        expect(formatAuditAction('vehicle.update')).toBe('Updated vehicle');
      });

      it('should format vehicle.delete', () => {
        expect(formatAuditAction('vehicle.delete')).toBe('Deleted vehicle');
      });
    });

    describe('booking actions', () => {
      it('should format booking.create', () => {
        expect(formatAuditAction('booking.create')).toBe('Created booking');
      });

      it('should format booking.update', () => {
        expect(formatAuditAction('booking.update')).toBe('Updated booking');
      });

      it('should format booking.cancel', () => {
        expect(formatAuditAction('booking.cancel')).toBe('Cancelled booking');
      });

      it('should format booking.confirm', () => {
        expect(formatAuditAction('booking.confirm')).toBe('Confirmed booking');
      });
    });

    describe('review actions', () => {
      it('should format review.create', () => {
        expect(formatAuditAction('review.create')).toBe('Created review');
      });

      it('should format review.update', () => {
        expect(formatAuditAction('review.update')).toBe('Updated review');
      });

      it('should format review.delete', () => {
        expect(formatAuditAction('review.delete')).toBe('Deleted review');
      });
    });

    describe('payment actions', () => {
      it('should format payment.update', () => {
        expect(formatAuditAction('payment.update')).toBe('Updated payment');
      });
    });

    describe('permission actions', () => {
      it('should format permission.grant', () => {
        expect(formatAuditAction('permission.grant')).toBe('Granted permission');
      });

      it('should format permission.revoke', () => {
        expect(formatAuditAction('permission.revoke')).toBe('Revoked permission');
      });
    });

    describe('unknown actions', () => {
      it('should return action as-is for unknown actions', () => {
        // @ts-expect-error Testing unknown action
        expect(formatAuditAction('unknown.action')).toBe('unknown.action');
      });
    });
  });

  // ============================================
  // getRequestInfo() TESTS
  // ============================================
  describe('getRequestInfo()', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: new Headers({
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'Mozilla/5.0',
        }),
      } as Request;

      const info = getRequestInfo(mockRequest);

      expect(info.ipAddress).toBe('192.168.1.1');
      expect(info.userAgent).toBe('Mozilla/5.0');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', () => {
      const mockRequest = {
        headers: new Headers({
          'x-real-ip': '10.0.0.1',
          'user-agent': 'Chrome/100',
        }),
      } as Request;

      const info = getRequestInfo(mockRequest);

      expect(info.ipAddress).toBe('10.0.0.1');
    });

    it('should return undefined for IP when no headers present', () => {
      const mockRequest = {
        headers: new Headers({}),
      } as Request;

      const info = getRequestInfo(mockRequest);

      expect(info.ipAddress).toBeUndefined();
    });

    it('should extract user agent', () => {
      const mockRequest = {
        headers: new Headers({
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        }),
      } as Request;

      const info = getRequestInfo(mockRequest);

      expect(info.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('should return undefined for user agent when not present', () => {
      const mockRequest = {
        headers: new Headers({}),
      } as Request;

      const info = getRequestInfo(mockRequest);

      expect(info.userAgent).toBeUndefined();
    });

    it('should trim whitespace from x-forwarded-for', () => {
      const mockRequest = {
        headers: new Headers({
          'x-forwarded-for': '  192.168.1.1  ,  10.0.0.1  ',
        }),
      } as Request;

      const info = getRequestInfo(mockRequest);

      expect(info.ipAddress).toBe('192.168.1.1');
    });

    it('should handle empty x-forwarded-for', () => {
      const mockRequest = {
        headers: new Headers({
          'x-forwarded-for': '',
          'x-real-ip': '172.16.0.1',
        }),
      } as Request;

      const info = getRequestInfo(mockRequest);

      expect(info.ipAddress).toBe('172.16.0.1');
    });
  });

  // ============================================
  // TYPE DEFINITIONS TESTS
  // ============================================
  describe('type definitions', () => {
    it('should have all audit actions defined', () => {
      const allActions: AuditAction[] = [
        'user.create',
        'user.update',
        'user.delete',
        'user.suspend',
        'user.activate',
        'user.ban',
        'user.role_change',
        'user.login',
        'user.logout',
        'vehicle.create',
        'vehicle.update',
        'vehicle.delete',
        'booking.create',
        'booking.update',
        'booking.cancel',
        'booking.confirm',
        'review.create',
        'review.update',
        'review.delete',
        'payment.update',
        'permission.grant',
        'permission.revoke',
      ];

      // Each action should be formattable
      allActions.forEach((action) => {
        const formatted = formatAuditAction(action);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });
    });

    it('should have all resource types defined', () => {
      const allResources: AuditResource[] = [
        'User',
        'Vehicle',
        'Booking',
        'Review',
        'Payment',
        'Permission',
        'RolePermission',
        'UserPermission',
      ];

      expect(allResources.length).toBe(8);
    });
  });

  // ============================================
  // FORMATTED OUTPUT CONSISTENCY TESTS
  // ============================================
  describe('formatted output consistency', () => {
    it('should return human-readable strings', () => {
      const actions: AuditAction[] = [
        'user.create',
        'vehicle.update',
        'booking.cancel',
        'permission.grant',
      ];

      actions.forEach((action) => {
        const formatted = formatAuditAction(action);
        // Should not contain dots
        expect(formatted).not.toContain('.');
        // Should start with uppercase
        expect(formatted[0]).toBe(formatted[0].toUpperCase());
      });
    });

    it('should have unique formatted outputs for each action', () => {
      const actions: AuditAction[] = [
        'user.create',
        'user.update',
        'user.delete',
        'vehicle.create',
        'vehicle.update',
        'vehicle.delete',
        'booking.create',
        'booking.update',
        'booking.cancel',
      ];

      const formatted = actions.map((action) => formatAuditAction(action));
      const unique = [...new Set(formatted)];

      expect(formatted.length).toBe(unique.length);
    });
  });
});
