/**
 * Unit Tests for src/config/site.ts
 *
 * Tests all configuration values and helper functions including:
 * - Currency formatting
 * - Location utilities
 * - Brand configuration
 * - Business rules
 */

import {
  brand,
  contact,
  socialMedia,
  currency,
  locations,
  stats,
  team,
  milestones,
  testimonials,
  features,
  seo,
  developer,
  businessRules,
  mileageConfig,
  fuelLevels,
  paymentMethods,
  documentTypes,
  invoiceConfig,
  formatCurrency,
  formatPrice,
  getAllLocationNames,
} from '@/config/site';

describe('config/site', () => {
  // ============================================
  // BRAND CONFIGURATION TESTS
  // ============================================
  describe('brand configuration', () => {
    it('should have required brand properties', () => {
      expect(brand.name).toBeDefined();
      expect(brand.tagline).toBeDefined();
      expect(brand.description).toBeDefined();
      expect(brand.heroTagline).toBeDefined();
      expect(brand.heroSubtitle).toBeDefined();
    });

    it('should have valid brand values', () => {
      expect(brand.name).toBe('RentWheels');
      expect(brand.country).toBe('Sri Lanka');
      expect(brand.foundedYear).toBe(2014);
      expect(typeof brand.version).toBe('string');
    });

    it('should have logo and favicon paths', () => {
      expect(brand.logo).toMatch(/^\/.+/);
      expect(brand.favicon).toMatch(/^\/.+/);
    });
  });

  // ============================================
  // CONTACT CONFIGURATION TESTS
  // ============================================
  describe('contact configuration', () => {
    it('should have email addresses', () => {
      expect(contact.email.general).toMatch(/@/);
      expect(contact.email.support).toMatch(/@/);
      expect(contact.email.bookings).toMatch(/@/);
    });

    it('should have phone numbers', () => {
      expect(contact.phone.main).toBeDefined();
      expect(contact.phone.mobile).toBeDefined();
      expect(contact.phone.whatsapp).toBeDefined();
    });

    it('should have address information', () => {
      expect(contact.address.street).toBeDefined();
      expect(contact.address.city).toBeDefined();
      expect(contact.address.country).toBe('Sri Lanka');
      expect(contact.address.full).toContain(contact.address.street);
    });

    it('should have operating hours', () => {
      expect(contact.operatingHours.default).toBeDefined();
      expect(contact.operatingHours.weekdays).toBeDefined();
      expect(contact.operatingHours.weekends).toBeDefined();
    });
  });

  // ============================================
  // SOCIAL MEDIA TESTS
  // ============================================
  describe('social media configuration', () => {
    it('should have valid social media URLs', () => {
      expect(socialMedia.facebook).toMatch(/^https:\/\//);
      expect(socialMedia.instagram).toMatch(/^https:\/\//);
      expect(socialMedia.twitter).toMatch(/^https:\/\//);
      expect(socialMedia.youtube).toMatch(/^https:\/\//);
      expect(socialMedia.linkedin).toMatch(/^https:\/\//);
    });

    it('should have valid whatsapp URL', () => {
      expect(socialMedia.whatsapp).toMatch(/^https:\/\/wa\.me\//);
    });
  });

  // ============================================
  // CURRENCY CONFIGURATION TESTS
  // ============================================
  describe('currency configuration', () => {
    it('should have valid currency settings', () => {
      expect(currency.code).toBe('LKR');
      expect(currency.symbol).toBe('Rs.');
      expect(currency.name).toBe('Sri Lankan Rupee');
      expect(currency.locale).toBe('en-LK');
    });

    it('should have valid position setting', () => {
      expect(['before', 'after']).toContain(currency.position);
    });
  });

  // ============================================
  // formatCurrency() TESTS
  // ============================================
  describe('formatCurrency()', () => {
    it('should format positive amounts correctly', () => {
      const formatted = formatCurrency(1000);
      expect(formatted).toContain('Rs.');
      expect(formatted).toContain('1');
    });

    it('should format zero correctly', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('Rs.');
      expect(formatted).toContain('0');
    });

    it('should format large amounts with locale formatting', () => {
      const formatted = formatCurrency(1000000);
      expect(formatted).toContain('Rs.');
      // Should have some form of thousand separator or formatted output
    });

    it('should handle decimal amounts', () => {
      const formatted = formatCurrency(1500.50);
      expect(formatted).toContain('Rs.');
    });

    it('should place symbol according to position setting', () => {
      const formatted = formatCurrency(1000);
      if (currency.position === 'before') {
        expect(formatted).toMatch(/^Rs\./);
      } else {
        expect(formatted).toMatch(/Rs\.$/);
      }
    });
  });

  // ============================================
  // formatPrice() TESTS
  // ============================================
  describe('formatPrice()', () => {
    it('should format price without suffix', () => {
      const formatted = formatPrice(5000);
      expect(formatted).toContain('Rs.');
      expect(formatted).toContain('5');
    });

    it('should format price with suffix', () => {
      const formatted = formatPrice(5000, '/day');
      expect(formatted).toContain('Rs.');
      expect(formatted).toContain('/day');
    });

    it('should handle empty suffix', () => {
      const formatted = formatPrice(5000, '');
      expect(formatted).not.toContain('undefined');
    });
  });

  // ============================================
  // LOCATIONS CONFIGURATION TESTS
  // ============================================
  describe('locations configuration', () => {
    it('should have all locations array', () => {
      expect(locations.all).toBeInstanceOf(Array);
      expect(locations.all.length).toBeGreaterThan(0);
      expect(locations.all).toContain('Colombo');
      expect(locations.all).toContain('Kandy');
    });

    it('should have airport locations', () => {
      expect(locations.airports).toBeInstanceOf(Array);
      expect(locations.airports.length).toBeGreaterThan(0);

      const airport = locations.airports[0];
      expect(airport.name).toBeDefined();
      expect(airport.code).toBeDefined();
      expect(airport.full).toBeDefined();
    });

    it('should have popular destinations', () => {
      expect(locations.popular).toBeInstanceOf(Array);
      expect(locations.popular.length).toBeGreaterThan(0);
    });

    it('should have branch offices', () => {
      expect(locations.branches).toBeInstanceOf(Array);
      expect(locations.branches.length).toBeGreaterThan(0);

      const branch = locations.branches[0];
      expect(branch.name).toBeDefined();
      expect(branch.address).toBeDefined();
      expect(branch.phone).toBeDefined();
      expect(branch.hours).toBeDefined();
      expect(typeof branch.isHeadquarters).toBe('boolean');
    });

    it('should have exactly one headquarters', () => {
      const headquarters = locations.branches.filter(b => b.isHeadquarters);
      expect(headquarters.length).toBe(1);
    });
  });

  // ============================================
  // getAllLocationNames() TESTS
  // ============================================
  describe('getAllLocationNames()', () => {
    it('should return all regular locations', () => {
      const names = getAllLocationNames();
      locations.all.forEach(loc => {
        expect(names).toContain(loc);
      });
    });

    it('should include airport locations with codes', () => {
      const names = getAllLocationNames();
      locations.airports.forEach(airport => {
        const expected = `${airport.name} (${airport.code})`;
        expect(names).toContain(expected);
      });
    });

    it('should return more locations than just regular locations', () => {
      const names = getAllLocationNames();
      expect(names.length).toBeGreaterThan(locations.all.length);
    });

    it('should not have duplicates', () => {
      const names = getAllLocationNames();
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });
  });

  // ============================================
  // BUSINESS STATISTICS TESTS
  // ============================================
  describe('stats configuration', () => {
    it('should have positive statistics', () => {
      expect(stats.yearsExperience).toBeGreaterThan(0);
      expect(stats.vehiclesInFleet).toBeGreaterThan(0);
      expect(stats.happyCustomers).toBeGreaterThan(0);
      expect(stats.locationsCount).toBeGreaterThan(0);
    });

    it('should have valid rating', () => {
      expect(stats.averageRating).toBeGreaterThanOrEqual(0);
      expect(stats.averageRating).toBeLessThanOrEqual(5);
    });

    it('should have vehicle type breakdown', () => {
      expect(stats.vehicleTypes).toBeDefined();
      expect(stats.vehicleTypes.cars).toBeGreaterThan(0);
      expect(stats.vehicleTypes.suvs).toBeGreaterThan(0);
    });
  });

  // ============================================
  // TEAM CONFIGURATION TESTS
  // ============================================
  describe('team configuration', () => {
    it('should have team members', () => {
      expect(team).toBeInstanceOf(Array);
      expect(team.length).toBeGreaterThan(0);
    });

    it('should have required team member properties', () => {
      team.forEach(member => {
        expect(member.name).toBeDefined();
        expect(member.role).toBeDefined();
        expect(member.description).toBeDefined();
        expect(member.image).toBeDefined();
      });
    });
  });

  // ============================================
  // MILESTONES CONFIGURATION TESTS
  // ============================================
  describe('milestones configuration', () => {
    it('should have milestones', () => {
      expect(milestones).toBeInstanceOf(Array);
      expect(milestones.length).toBeGreaterThan(0);
    });

    it('should have chronological milestones', () => {
      for (let i = 1; i < milestones.length; i++) {
        expect(milestones[i].year).toBeGreaterThanOrEqual(milestones[i - 1].year);
      }
    });

    it('should have required milestone properties', () => {
      milestones.forEach(milestone => {
        expect(milestone.year).toBeGreaterThan(2000);
        expect(milestone.title).toBeDefined();
        expect(milestone.description).toBeDefined();
      });
    });
  });

  // ============================================
  // TESTIMONIALS CONFIGURATION TESTS
  // ============================================
  describe('testimonials configuration', () => {
    it('should have testimonials', () => {
      expect(testimonials).toBeInstanceOf(Array);
      expect(testimonials.length).toBeGreaterThan(0);
    });

    it('should have valid ratings', () => {
      testimonials.forEach(testimonial => {
        expect(testimonial.rating).toBeGreaterThanOrEqual(1);
        expect(testimonial.rating).toBeLessThanOrEqual(5);
      });
    });

    it('should have required testimonial properties', () => {
      testimonials.forEach(testimonial => {
        expect(testimonial.name).toBeDefined();
        expect(testimonial.role).toBeDefined();
        expect(testimonial.content).toBeDefined();
        expect(testimonial.image).toBeDefined();
      });
    });
  });

  // ============================================
  // FEATURES CONFIGURATION TESTS
  // ============================================
  describe('features configuration', () => {
    it('should have features', () => {
      expect(features).toBeInstanceOf(Array);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should have required feature properties', () => {
      features.forEach(feature => {
        expect(feature.title).toBeDefined();
        expect(feature.description).toBeDefined();
        expect(feature.icon).toBeDefined();
      });
    });
  });

  // ============================================
  // SEO CONFIGURATION TESTS
  // ============================================
  describe('seo configuration', () => {
    it('should have required SEO properties', () => {
      expect(seo.title).toBeDefined();
      expect(seo.description).toBeDefined();
      expect(seo.keywords).toBeInstanceOf(Array);
      expect(seo.ogImage).toBeDefined();
    });

    it('should have brand name in title', () => {
      expect(seo.title).toContain(brand.name);
    });
  });

  // ============================================
  // DEVELOPER CONFIGURATION TESTS
  // ============================================
  describe('developer configuration', () => {
    it('should have developer information', () => {
      expect(developer.name).toBeDefined();
      expect(developer.url).toMatch(/^https?:\/\//);
      expect(typeof developer.showCredit).toBe('boolean');
    });
  });

  // ============================================
  // BUSINESS RULES TESTS
  // ============================================
  describe('businessRules configuration', () => {
    it('should have valid booking constraints', () => {
      expect(businessRules.minBookingHours).toBeGreaterThan(0);
      expect(businessRules.maxBookingDays).toBeGreaterThan(0);
      expect(businessRules.maxBookingDays).toBeGreaterThan(businessRules.minBookingHours / 24);
    });

    it('should have valid financial rules', () => {
      expect(businessRules.depositPercentage).toBeGreaterThanOrEqual(0);
      expect(businessRules.depositPercentage).toBeLessThanOrEqual(100);
      expect(businessRules.lateFeePerHour).toBeGreaterThan(0);
    });

    it('should have cancellation policy', () => {
      expect(businessRules.cancellationHours).toBeGreaterThan(0);
    });
  });

  // ============================================
  // MILEAGE CONFIGURATION TESTS
  // ============================================
  describe('mileageConfig configuration', () => {
    it('should have valid mileage settings', () => {
      expect(mileageConfig.freeMileagePerDay).toBeGreaterThan(0);
      expect(mileageConfig.extraMileageRate).toBeGreaterThan(0);
      expect(mileageConfig.unlimitedMileagePerDay).toBeGreaterThan(0);
      expect(mileageConfig.maxDailyMileage).toBeGreaterThan(mileageConfig.freeMileagePerDay);
    });
  });

  // ============================================
  // FUEL LEVELS TESTS
  // ============================================
  describe('fuelLevels configuration', () => {
    it('should have fuel level options', () => {
      expect(fuelLevels).toBeInstanceOf(Array);
      expect(fuelLevels.length).toBeGreaterThan(0);
    });

    it('should have FULL level at 100%', () => {
      const full = fuelLevels.find(f => f.value === 'FULL');
      expect(full).toBeDefined();
      expect(full?.percentage).toBe(100);
    });

    it('should have EMPTY level at 0%', () => {
      const empty = fuelLevels.find(f => f.value === 'EMPTY');
      expect(empty).toBeDefined();
      expect(empty?.percentage).toBe(0);
    });

    it('should have valid percentage values', () => {
      fuelLevels.forEach(level => {
        expect(level.percentage).toBeGreaterThanOrEqual(0);
        expect(level.percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  // ============================================
  // PAYMENT METHODS TESTS
  // ============================================
  describe('paymentMethods configuration', () => {
    it('should have payment method options', () => {
      expect(paymentMethods).toBeInstanceOf(Array);
      expect(paymentMethods.length).toBeGreaterThan(0);
    });

    it('should have CASH option', () => {
      const cash = paymentMethods.find(p => p.value === 'CASH');
      expect(cash).toBeDefined();
    });

    it('should have CARD option', () => {
      const card = paymentMethods.find(p => p.value === 'CARD');
      expect(card).toBeDefined();
    });

    it('should have required properties', () => {
      paymentMethods.forEach(method => {
        expect(method.value).toBeDefined();
        expect(method.label).toBeDefined();
      });
    });
  });

  // ============================================
  // DOCUMENT TYPES TESTS
  // ============================================
  describe('documentTypes configuration', () => {
    it('should have document type options', () => {
      expect(documentTypes).toBeInstanceOf(Array);
      expect(documentTypes.length).toBeGreaterThan(0);
    });

    it('should have essential document types', () => {
      const values = documentTypes.map(d => d.value);
      expect(values).toContain('ID_CARD');
      expect(values).toContain('DRIVING_LICENSE');
    });

    it('should have required properties', () => {
      documentTypes.forEach(doc => {
        expect(doc.value).toBeDefined();
        expect(doc.label).toBeDefined();
      });
    });
  });

  // ============================================
  // INVOICE CONFIGURATION TESTS
  // ============================================
  describe('invoiceConfig configuration', () => {
    it('should have valid tax settings', () => {
      expect(invoiceConfig.taxRate).toBeGreaterThanOrEqual(0);
      expect(invoiceConfig.taxName).toBeDefined();
    });

    it('should have invoice prefix', () => {
      expect(invoiceConfig.invoicePrefix).toBeDefined();
      expect(invoiceConfig.invoicePrefix.length).toBeGreaterThan(0);
    });

    it('should have company details', () => {
      expect(invoiceConfig.companyDetails.name).toBe(brand.name);
      expect(invoiceConfig.companyDetails.address).toBeDefined();
      expect(invoiceConfig.companyDetails.phone).toBeDefined();
      expect(invoiceConfig.companyDetails.email).toBeDefined();
    });

    it('should have bank details', () => {
      expect(invoiceConfig.bankDetails.bankName).toBeDefined();
      expect(invoiceConfig.bankDetails.accountName).toBeDefined();
      expect(invoiceConfig.bankDetails.accountNumber).toBeDefined();
    });

    it('should have payment terms', () => {
      expect(invoiceConfig.paymentTermsDays).toBeGreaterThan(0);
      expect(invoiceConfig.defaultTerms).toBeDefined();
      expect(invoiceConfig.defaultTerms.length).toBeGreaterThan(0);
    });
  });
});
