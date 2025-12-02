import Hero from "@/components/Hero";
import VehicleCard from "@/components/VehicleCard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { brand, stats as siteStats, locations, testimonials as siteTestimonials, features as siteFeatures } from "@/config/site";

async function getFeaturedVehicles() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { featured: true, available: true },
      take: 6,
      include: {
        reviews: {
          select: { rating: true },
        },
      },
    });
    return vehicles.map((vehicle) => ({
      ...vehicle,
      pricePerDay: Number(vehicle.pricePerDay),
      avgRating:
        vehicle.reviews.length > 0
          ? vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) /
            vehicle.reviews.length
          : 0,
      reviewCount: vehicle.reviews.length,
    }));
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const [vehicleCount, bookingCount, userCount] = await Promise.all([
      prisma.vehicle.count(),
      prisma.booking.count(),
      prisma.user.count(),
    ]);
    return { vehicleCount, bookingCount, userCount };
  } catch {
    return { vehicleCount: 500, bookingCount: 10000, userCount: 5000 };
  }
}

const vehicleTypes = [
  {
    name: "Cars",
    icon: "🚗",
    description: "Sedans, SUVs & Hatchbacks",
    count: `${siteStats.vehicleTypes.cars}+`,
  },
  {
    name: "Vans",
    icon: "🚐",
    description: "Perfect for groups",
    count: `${siteStats.vehicleTypes.vans}+`,
  },
  {
    name: "SUVs",
    icon: "🚙",
    description: "Adventure ready",
    count: `${siteStats.vehicleTypes.suvs}+`,
  },
  {
    name: "Luxury",
    icon: "✨",
    description: "Premium experience",
    count: `${siteStats.vehicleTypes.luxury}+`,
  },
  {
    name: "Bikes",
    icon: "🏍️",
    description: "Scooters & Motorcycles",
    count: `${siteStats.vehicleTypes.motorcycles}+`,
  },
  {
    name: "Tuk Tuks",
    icon: "🛺",
    description: "Local experience",
    count: `${siteStats.vehicleTypes.tuktuks}+`,
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Choose Your Vehicle",
    description: "Browse our extensive fleet and select the perfect vehicle for your journey across Sri Lanka.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Book & Pay Securely",
    description: "Reserve your vehicle instantly with our secure payment system. No hidden fees.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Pick Up & Explore",
    description: "Collect your vehicle from any location or get it delivered. Start your adventure!",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// Destination images mapping - update as needed
const destinationImages: Record<string, { image: string; description: string }> = {
  Colombo: { image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", description: "Capital city vibes" },
  Kandy: { image: "https://images.unsplash.com/photo-1586016413664-864c0dd76f53?w=400", description: "Cultural heritage" },
  Galle: { image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400", description: "Colonial charm" },
  Ella: { image: "https://images.unsplash.com/photo-1546708770-599a11f5498f?w=400", description: "Mountain paradise" },
  Sigiriya: { image: "https://images.unsplash.com/photo-1588598198321-9735fd52bd5d?w=400", description: "Ancient wonder" },
  Mirissa: { image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400", description: "Beach heaven" },
};

// Generate destinations from config
const destinations = locations.popular.map((location) => ({
  name: location,
  image: destinationImages[location]?.image || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
  description: destinationImages[location]?.description || "Explore this destination",
}));

// Use testimonials from config with placeholder images
const testimonials = siteTestimonials.map((t, index) => ({
  ...t,
  image: `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${index + 1}.jpg`,
}));

// Feature icons mapping
const featureIcons: Record<string, string> = {
  "Airport Pickup": "✈️",
  "24/7 Support": "📞",
  "Full Insurance": "🛡️",
  "Flexible Rental": "📅",
  "Free Cancellation": "❌",
  "GPS Navigation": "📍",
};

// Use features from config with icons
const features = siteFeatures.map((f) => ({
  title: f.title,
  description: f.description,
  icon: featureIcons[f.title] || "✨",
}));

export default async function Home() {
  const featuredVehicles = await getFeaturedVehicles();
  const stats = await getStats();

  return (
    <div className="overflow-x-hidden">
      <Hero />

      {/* Vehicle Types Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Our Fleet</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">
              Find Your Perfect Ride
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From budget-friendly options to luxury vehicles, we have the perfect ride for every traveler
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {vehicleTypes.map((type) => (
              <Link
                key={type.name}
                href={`/vehicles?type=${type.name.toLowerCase()}`}
                className="group relative bg-slate-50 rounded-2xl p-6 text-center hover:bg-gradient-to-br hover:from-blue-500 hover:to-purple-600 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {type.icon}
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-white transition-colors">
                  {type.name}
                </h3>
                <p className="text-xs text-slate-500 group-hover:text-white/80 transition-colors mt-1">
                  {type.description}
                </p>
                <span className="absolute top-3 right-3 text-xs font-bold text-blue-600 group-hover:text-white transition-colors">
                  {type.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="text-blue-400 font-semibold text-sm uppercase tracking-wider">Simple Process</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Rent a vehicle in just 3 easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
                )}
                <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:-translate-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mb-6">
                    {item.icon}
                  </div>
                  <span className="text-6xl font-bold text-white/5 absolute top-4 right-6">
                    {item.step}
                  </span>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vehicles Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Top Picks</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">
                Featured Vehicles
              </h2>
              <p className="text-slate-600 max-w-xl">
                Hand-picked selection of our most popular and highly-rated vehicles
              </p>
            </div>
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition mt-4 md:mt-0"
            >
              View All Vehicles
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {featuredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  id={vehicle.id}
                  name={vehicle.name}
                  brand={vehicle.brand}
                  model={vehicle.model}
                  year={vehicle.year}
                  type={vehicle.type}
                  transmission={vehicle.transmission}
                  fuelType={vehicle.fuelType}
                  seats={vehicle.seats}
                  pricePerDay={vehicle.pricePerDay}
                  images={vehicle.images}
                  avgRating={vehicle.avgRating}
                  reviewCount={vehicle.reviewCount}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Coming Soon</h3>
              <p className="text-slate-500">Our featured vehicles will be available shortly.</p>
            </div>
          )}
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Explore Sri Lanka</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">
              Popular Destinations
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Discover the most beautiful places in Sri Lanka with our reliable vehicles
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {destinations.map((dest, index) => (
              <Link
                key={dest.name}
                href={`/vehicles?location=${dest.name}`}
                className={`group relative rounded-2xl overflow-hidden ${
                  index === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
              >
                <div className={`relative ${index === 0 ? "h-64 md:h-full min-h-[400px]" : "h-48 md:h-64"}`}>
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white font-bold text-xl md:text-2xl">{dest.name}</h3>
                    <p className="text-white/80 text-sm">{dest.description}</p>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-white text-sm font-medium">Explore →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">
              The {brand.name} Advantage
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Experience the best vehicle rental service in Sri Lanka
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Don&apos;t just take our word for it - hear from our happy customers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-slate-50 rounded-2xl p-8 relative"
              >
                <div className="absolute top-6 right-6 text-6xl text-blue-100 font-serif">&quot;</div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 mb-6 relative z-10">{testimonial.content}</p>
                <div className="flex items-center gap-4">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{stats.vehicleCount}+</div>
              <div className="text-blue-100">Vehicles Available</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{stats.bookingCount.toLocaleString()}+</div>
              <div className="text-blue-100">Successful Rentals</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{stats.userCount.toLocaleString()}+</div>
              <div className="text-blue-100">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">15+</div>
              <div className="text-blue-100">Locations Island-wide</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920"
            alt="Road trip"
            fill
            className="object-cover opacity-20"
          />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your Sri Lankan Adventure?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Book your perfect vehicle today and explore the beauty of Sri Lanka at your own pace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vehicles"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25"
            >
              Browse Vehicles
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Partners/Trust Section */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500 mb-8">Trusted by leading companies and travel agencies</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50">
            {["Sri Lankan Airlines", "Cinnamon Hotels", "Jetwing", "Aitken Spence", "John Keells"].map((partner) => (
              <div key={partner} className="text-xl font-bold text-slate-400">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
