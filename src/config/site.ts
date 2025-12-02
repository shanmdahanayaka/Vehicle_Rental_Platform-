/**
 * Site Configuration
 *
 * This file contains all configurable values for the application.
 * Change these values to customize the application for different clients/companies.
 *
 * When selling this application to a new company:
 * 1. Update the brand section with their company name and tagline
 * 2. Update contact information
 * 3. Update social media links
 * 4. Update locations based on their service areas
 * 5. Update currency settings for their region
 * 6. Update business stats, team, and milestones
 */

// ============================================
// BRAND CONFIGURATION
// ============================================
export const brand = {
  name: "RentWheels",
  tagline: "Your Journey, Your Way",
  description: "Sri Lanka's premier vehicle rental service. Explore the pearl of the Indian Ocean with our premium fleet of cars, SUVs, vans, and more. Your adventure starts here.",
  heroTagline: "Sri Lanka's #1 Vehicle Rental Service",
  heroSubtitle: "Discover the pearl of the Indian Ocean with our premium fleet. From ancient temples to pristine beaches - your adventure starts here.",
  logo: "/logo.png", // Path to logo image
  favicon: "/favicon.ico",
  version: "0.1.0",
  foundedYear: 2014,
  country: "Sri Lanka",
  countryNickname: "the pearl of the Indian Ocean",
};

// ============================================
// CONTACT INFORMATION
// ============================================
export const contact = {
  email: {
    general: "info@rentwheels.lk",
    support: "support@rentwheels.lk",
    bookings: "bookings@rentwheels.lk",
  },
  phone: {
    main: "+94 11 234 5678",
    mobile: "+94 77 123 4567",
    whatsapp: "+94771234567", // Without spaces for wa.me link
  },
  address: {
    street: "123 Galle Road",
    city: "Colombo 03",
    country: "Sri Lanka",
    full: "123 Galle Road, Colombo 03, Sri Lanka",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.798467128636!2d79.84817661477276!3d6.9146477950441!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25963120b1509%3A0x2db2c18a68712b40!2sGalle%20Rd%2C%20Colombo!5e0!3m2!1sen!2slk!4v1635000000000!5m2!1sen!2slk",
  },
  operatingHours: {
    default: "Mon - Sun: 6:00 AM - 10:00 PM",
    weekdays: "6:00 AM - 10:00 PM",
    weekends: "6:00 AM - 10:00 PM",
  },
};

// ============================================
// SOCIAL MEDIA LINKS
// ============================================
export const socialMedia = {
  facebook: "https://facebook.com/rentwheels",
  instagram: "https://instagram.com/rentwheels",
  twitter: "https://twitter.com/rentwheels",
  youtube: "https://youtube.com/rentwheels",
  linkedin: "https://linkedin.com/company/rentwheels",
  whatsapp: `https://wa.me/${contact.phone.whatsapp}`,
};

// ============================================
// CURRENCY CONFIGURATION
// ============================================
export const currency = {
  code: "LKR",
  symbol: "Rs.",
  name: "Sri Lankan Rupee",
  locale: "en-LK",
  position: "before" as const, // "before" for Rs. 1000 or "after" for 1000 Rs.
};

// Helper function to format currency
export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString(currency.locale);
  return currency.position === "before"
    ? `${currency.symbol}${formatted}`
    : `${formatted} ${currency.symbol}`;
}

// Helper function for price display with suffix
export function formatPrice(amount: number, suffix?: string): string {
  const formatted = formatCurrency(amount);
  return suffix ? `${formatted}${suffix}` : formatted;
}

// ============================================
// LOCATIONS CONFIGURATION
// ============================================
export const locations = {
  // All service locations
  all: [
    "Colombo",
    "Kandy",
    "Galle",
    "Negombo",
    "Ella",
    "Nuwara Eliya",
    "Sigiriya",
    "Anuradhapura",
    "Trincomalee",
    "Jaffna",
    "Mirissa",
    "Hikkaduwa",
    "Bentota",
    "Dambulla",
    "Polonnaruwa",
  ],
  // Airport locations
  airports: [
    { name: "Bandaranaike Airport", code: "CMB", full: "Bandaranaike International Airport" },
    { name: "Mattala Airport", code: "HRI", full: "Mattala Rajapaksa International Airport" },
  ],
  // Popular destinations (for homepage/footer)
  popular: ["Colombo", "Kandy", "Galle", "Ella", "Sigiriya", "Mirissa"],
  // Branch offices
  branches: [
    {
      name: "Colombo",
      address: "123 Galle Road, Colombo 03",
      phone: "+94 11 234 5678",
      hours: "6:00 AM - 10:00 PM",
      isHeadquarters: true,
    },
    {
      name: "Kandy",
      address: "45 Peradeniya Road, Kandy",
      phone: "+94 81 234 5678",
      hours: "6:00 AM - 9:00 PM",
      isHeadquarters: false,
    },
    {
      name: "Galle",
      address: "78 Main Street, Galle Fort",
      phone: "+94 91 234 5678",
      hours: "7:00 AM - 9:00 PM",
      isHeadquarters: false,
    },
    {
      name: "Negombo",
      address: "12 Beach Road, Negombo",
      phone: "+94 31 234 5678",
      hours: "5:00 AM - 11:00 PM",
      isHeadquarters: false,
    },
    {
      name: "Bandaranaike Airport",
      address: "Arrivals Terminal, CMB Airport",
      phone: "+94 11 225 5678",
      hours: "24/7",
      isHeadquarters: false,
    },
    {
      name: "Ella",
      address: "Main Street, Ella Town",
      phone: "+94 57 234 5678",
      hours: "7:00 AM - 8:00 PM",
      isHeadquarters: false,
    },
  ],
};

// Get all location names including airports for dropdowns
export function getAllLocationNames(): string[] {
  const airportNames = locations.airports.map(a => `${a.name} (${a.code})`);
  return [...locations.all, ...airportNames];
}

// ============================================
// BUSINESS STATISTICS
// ============================================
export const stats = {
  yearsExperience: 10,
  vehiclesInFleet: 500,
  happyCustomers: 50000,
  locationsCount: 15,
  averageRating: 4.9,
  totalBookings: 10000,
  // Vehicle type counts (for display purposes)
  vehicleTypes: {
    cars: 200,
    suvs: 80,
    vans: 50,
    luxury: 30,
    motorcycles: 100,
    tuktuks: 40,
  },
};

// ============================================
// TEAM MEMBERS
// ============================================
export const team = [
  {
    name: "Rajitha Perera",
    role: "Founder & CEO",
    description: "With over 20 years in Sri Lankan tourism, Rajitha founded the company with a vision to transform vehicle rental.",
    image: "/team/rajitha.jpg",
  },
  {
    name: "Nalini Fernando",
    role: "Operations Director",
    description: "Nalini ensures our fleet is always in top condition with her expert fleet management skills.",
    image: "/team/nalini.jpg",
  },
  {
    name: "Kasun Silva",
    role: "Customer Experience Head",
    description: "Kasun is passionate about ensuring every customer has an exceptional experience.",
    image: "/team/kasun.jpg",
  },
  {
    name: "Chamari Jayawardena",
    role: "Marketing Director",
    description: `Building the ${brand.name} brand story and connecting with travelers worldwide.`,
    image: "/team/chamari.jpg",
  },
];

// ============================================
// COMPANY MILESTONES/TIMELINE
// ============================================
export const milestones = [
  {
    year: 2014,
    title: "The Beginning",
    description: "Started with just 5 vehicles in Colombo, driven by a passion for Sri Lankan tourism.",
  },
  {
    year: 2016,
    title: "Expanding Horizons",
    description: "Opened branches in Kandy and Galle, growing our fleet to 50 vehicles.",
  },
  {
    year: 2018,
    title: "Going Digital",
    description: "Launched our online booking platform, 24/7 customer support, and GPS tracking.",
  },
  {
    year: 2020,
    title: "Resilience & Growth",
    description: "Expanded to 200 vehicles, implemented enhanced sanitization protocols.",
  },
  {
    year: 2022,
    title: "Island-wide Presence",
    description: "Reached 15 locations across Sri Lanka, added luxury and eco-friendly vehicles.",
  },
  {
    year: 2024,
    title: "Leading the Industry",
    description: "500+ vehicle fleet, award-winning service, trusted by thousands of travelers.",
  },
];

// ============================================
// TESTIMONIALS
// ============================================
export const testimonials = [
  {
    name: "Kasun Perera",
    role: "Tourist from Australia",
    content: "Excellent service! The car was spotless and the pickup process was seamless. Highly recommend for anyone visiting Sri Lanka.",
    rating: 5,
    image: "/testimonials/kasun.jpg",
  },
  {
    name: "Sarah Johnson",
    role: "Travel Blogger",
    content: "I've rented cars in many countries, but this was by far the best experience. Great prices and even better service!",
    rating: 5,
    image: "/testimonials/sarah.jpg",
  },
  {
    name: "Nuwan Silva",
    role: "Business Traveler",
    content: "Professional, punctual, and reliable. Perfect for business trips. The 24/7 support gave me peace of mind.",
    rating: 5,
    image: "/testimonials/nuwan.jpg",
  },
];

// ============================================
// FEATURES/SERVICES
// ============================================
export const features = [
  {
    title: "Airport Pickup",
    description: `Free pickup at ${locations.airports[0].full}. We'll be waiting when you land.`,
    icon: "plane",
  },
  {
    title: "24/7 Support",
    description: "Round-the-clock customer service. We're always here to help.",
    icon: "support",
  },
  {
    title: "Full Insurance",
    description: "Comprehensive insurance coverage included with every rental.",
    icon: "shield",
  },
  {
    title: "Flexible Rental",
    description: "Hourly, daily, weekly, or monthly - choose what works for you.",
    icon: "clock",
  },
  {
    title: "Free Cancellation",
    description: "Plans change - cancel up to 24 hours before for a full refund.",
    icon: "cancel",
  },
  {
    title: "GPS Navigation",
    description: "All vehicles equipped with GPS to help you explore with confidence.",
    icon: "map",
  },
];

// ============================================
// SEO & META CONFIGURATION
// ============================================
export const seo = {
  title: `${brand.name} - Vehicle Rental Platform`,
  description: brand.description,
  keywords: [
    "vehicle rental",
    "car rental",
    "Sri Lanka",
    "travel",
    "tourism",
    brand.name.toLowerCase(),
  ],
  ogImage: "/og-image.jpg",
  twitterHandle: "@rentwheels",
};

// ============================================
// DEVELOPER/COMPANY CREDITS
// ============================================
export const developer = {
  name: "CodeLink International",
  url: "https://codelinkinternational.com",
  showCredit: true, // Set to false to hide developer credit
};

// ============================================
// BUSINESS RULES
// ============================================
export const businessRules = {
  minBookingHours: 4,
  maxBookingDays: 90,
  cancellationHours: 24, // Free cancellation before this many hours
  depositPercentage: 20,
  lateFeePerHour: 500, // In local currency
};

// ============================================
// QUICK ACCESS - Combined Config Export
// ============================================
const siteConfig = {
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
  // Helper functions
  formatCurrency,
  formatPrice,
  getAllLocationNames,
};

export default siteConfig;
