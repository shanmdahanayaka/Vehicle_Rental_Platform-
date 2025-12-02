"use client";

import { useState } from "react";
import Link from "next/link";
import { brand, contact } from "@/config/site";

const faqCategories = [
  {
    name: "Booking & Reservations",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    questions: [
      {
        question: "How do I make a reservation?",
        answer: "You can make a reservation through our website by selecting your desired vehicle, pickup location, and dates. Simply click 'Book Now' on any vehicle page, fill in your details, and complete the payment. You'll receive a confirmation email immediately.",
      },
      {
        question: "Can I modify or cancel my booking?",
        answer: "Yes! You can modify or cancel your booking through your account dashboard or by contacting our customer support. Free cancellation is available up to 24 hours before your pickup time. Modifications are subject to vehicle availability.",
      },
      {
        question: "How far in advance should I book?",
        answer: "We recommend booking at least 3-5 days in advance, especially during peak tourist seasons (December-March, July-August). However, we also accept last-minute bookings subject to vehicle availability.",
      },
      {
        question: "Can I book a vehicle for someone else?",
        answer: "Yes, you can book on behalf of someone else. The person driving the vehicle must present their valid driver's license and a copy of the booking confirmation at pickup.",
      },
    ],
  },
  {
    name: "Documents & Requirements",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    questions: [
      {
        question: "What documents do I need to rent a vehicle?",
        answer: "For Sri Lankan residents: National ID card and a valid driving license. For international visitors: Valid passport, International Driving Permit (IDP) or a driving license from your home country, and a credit/debit card for the security deposit.",
      },
      {
        question: "Is an International Driving Permit (IDP) required?",
        answer: "While many countries' licenses are accepted, we strongly recommend having an IDP for smooth vehicle pickup and any interactions with local authorities. Some countries' licenses require official translation.",
      },
      {
        question: "What is the minimum age requirement?",
        answer: "The minimum age to rent a vehicle is 21 years, and you must have held a valid driver's license for at least 1 year. For luxury and high-performance vehicles, the minimum age is 25 years with 2+ years of driving experience.",
      },
      {
        question: "Do you accept digital copies of documents?",
        answer: "For the booking process, digital copies are acceptable. However, at vehicle pickup, you must present original documents for verification. We also take photos of documents for our records.",
      },
    ],
  },
  {
    name: "Payment & Pricing",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    questions: [
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit and debit cards (Visa, MasterCard, American Express), bank transfers, and cash payments at our offices. Online bookings require card payment for confirmation.",
      },
      {
        question: "Is a security deposit required?",
        answer: "Yes, a refundable security deposit is required at pickup. The amount varies by vehicle category: Economy (Rs. 25,000), Standard (Rs. 50,000), SUV/Van (Rs. 75,000), Luxury (Rs. 150,000). This is released within 7 days after vehicle return.",
      },
      {
        question: "What's included in the rental price?",
        answer: "Our rental prices include: comprehensive insurance, 24/7 roadside assistance, unlimited mileage (for most vehicles), basic maintenance, and GPS navigation. Fuel, tolls, and additional drivers are not included.",
      },
      {
        question: "Are there any hidden fees?",
        answer: "No hidden fees! Our pricing is transparent. Additional charges only apply for: extra drivers (Rs. 1,000/day), child seats (Rs. 500/day), GPS device (free), one-way rentals between cities, or damage/traffic violations during rental.",
      },
      {
        question: "Do you offer discounts for long-term rentals?",
        answer: "Yes! We offer progressive discounts: 7+ days (10% off), 14+ days (15% off), 30+ days (25% off). Corporate accounts and frequent renters may qualify for additional discounts.",
      },
    ],
  },
  {
    name: "Vehicle & Insurance",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    questions: [
      {
        question: "What type of insurance is included?",
        answer: "All rentals include Comprehensive Insurance covering third-party liability, theft, and damage (subject to excess). You can upgrade to Zero Excess Insurance for complete peace of mind at an additional Rs. 2,000/day.",
      },
      {
        question: "What happens if the vehicle breaks down?",
        answer: "We provide 24/7 roadside assistance. In case of breakdown, call our emergency hotline immediately. We'll either repair the vehicle on-site or provide a replacement vehicle, depending on the situation.",
      },
      {
        question: "Can I take the vehicle outside Sri Lanka?",
        answer: "No, our vehicles cannot be taken outside Sri Lanka. The rental agreement is valid only within Sri Lankan territory.",
      },
      {
        question: "Are the vehicles regularly maintained?",
        answer: "Absolutely! All vehicles undergo thorough maintenance checks between rentals including mechanical inspection, fluid levels, tire condition, brakes, and full sanitization. We maintain detailed service records for each vehicle.",
      },
      {
        question: "What fuel policy do you follow?",
        answer: "We follow a 'full-to-full' fuel policy. You'll receive the vehicle with a full tank and should return it full. If not returned full, we'll charge for refueling plus a service fee.",
      },
    ],
  },
  {
    name: "Pickup & Return",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    questions: [
      {
        question: "Where can I pick up and return the vehicle?",
        answer: "You can pick up and return at any of our 15+ locations across Sri Lanka including Colombo, Kandy, Galle, Negombo, Ella, and both airports. We also offer hotel delivery/pickup in major cities for an additional fee.",
      },
      {
        question: "Can I return the vehicle to a different location?",
        answer: "Yes! One-way rentals are available between all our locations. A one-way fee applies, varying by distance: within city (Free), nearby city (Rs. 3,000), across country (Rs. 5,000-10,000).",
      },
      {
        question: "What are your airport pickup procedures?",
        answer: "For airport pickups, our representative will meet you at arrivals with a name board. They'll guide you to complete paperwork and vehicle inspection. We recommend allowing 30-45 minutes for the pickup process.",
      },
      {
        question: "What if I'm late for pickup or return?",
        answer: "For pickup: We hold reservations for 2 hours. Beyond that, contact us to avoid cancellation. For return: Up to 1 hour late is complimentary. After that, you'll be charged for an additional day.",
      },
      {
        question: "Do you offer 24-hour pickup/return?",
        answer: "Our Bandaranaike Airport (CMB) location operates 24/7. Other locations operate from 6 AM to 10 PM. After-hours service may be arranged at select locations with advance notice.",
      },
    ],
  },
  {
    name: "Driving in Sri Lanka",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    questions: [
      {
        question: "Which side of the road do you drive on in Sri Lanka?",
        answer: "Sri Lanka follows left-hand traffic, similar to the UK, India, and Australia. If you're used to right-hand traffic, we recommend taking some time to adjust, especially at roundabouts and when turning.",
      },
      {
        question: "What are the speed limits in Sri Lanka?",
        answer: "Speed limits are: Urban areas (50 km/h), Rural roads (70 km/h), Highways/Expressways (100 km/h). Speed cameras and police checks are common. Always follow posted limits.",
      },
      {
        question: "Are the roads safe for self-driving?",
        answer: "Major highways and main roads are generally in good condition. However, rural roads can be narrow and winding. We recommend GPS navigation and driving during daylight hours, especially in mountainous areas like Ella and Nuwara Eliya.",
      },
      {
        question: "Can I hire a driver instead of self-driving?",
        answer: "Yes! We offer chauffeur services with experienced, English-speaking drivers. Rates start from Rs. 4,000/day plus accommodation. This is a popular option for those wanting a stress-free exploration.",
      },
    ],
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = searchQuery
    ? faqCategories.map((category) => ({
        ...category,
        questions: category.questions.filter(
          (q) =>
            q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((category) => category.questions.length > 0)
    : faqCategories;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-block px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-6">
              Help Center
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Frequently Asked
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Questions
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              Find answers to common questions about our vehicle rental services,
              booking process, and driving in Sri Lanka.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for answers..."
                  className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {searchQuery ? (
            // Search Results
            <div>
              <p className="text-slate-600 mb-8">
                Found {filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0)} results for &quot;{searchQuery}&quot;
              </p>
              {filteredCategories.length > 0 ? (
                <div className="space-y-6">
                  {filteredCategories.map((category, catIndex) => (
                    <div key={catIndex}>
                      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
                          {category.icon}
                        </span>
                        {category.name}
                      </h2>
                      <div className="space-y-4">
                        {category.questions.map((faq, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-2xl shadow-sm overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setOpenQuestion(
                                  openQuestion === catIndex * 100 + index
                                    ? null
                                    : catIndex * 100 + index
                                )
                              }
                              className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                            >
                              <span className="font-semibold text-slate-900">
                                {faq.question}
                              </span>
                              <svg
                                className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${
                                  openQuestion === catIndex * 100 + index
                                    ? "rotate-180"
                                    : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                            {openQuestion === catIndex * 100 + index && (
                              <div className="px-6 pb-5 text-slate-600">
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-slate-300 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-slate-600 text-lg">No results found for &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-blue-600 font-medium hover:text-blue-700"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Category View
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Category Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 px-2">Categories</h3>
                  <nav className="space-y-1">
                    {faqCategories.map((category, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setActiveCategory(index);
                          setOpenQuestion(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                          activeCategory === index
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className={activeCategory === index ? "text-white" : "text-slate-400"}>
                          {category.icon}
                        </span>
                        <span className="font-medium">{category.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Questions */}
              <div className="lg:col-span-3">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
                      {faqCategories[activeCategory].icon}
                    </span>
                    {faqCategories[activeCategory].name}
                  </h2>
                </div>

                <div className="space-y-4">
                  {faqCategories[activeCategory].questions.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setOpenQuestion(openQuestion === index ? null : index)
                        }
                        className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                      >
                        <span className="font-semibold text-slate-900">
                          {faq.question}
                        </span>
                        <svg
                          className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${
                            openQuestion === index ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {openQuestion === index && (
                        <div className="px-6 pb-5 text-slate-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Still Have Questions Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-6">
              <svg
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Still Have Questions?
            </h2>
            <p className="text-slate-600 mb-8 max-w-lg mx-auto">
              Can&apos;t find the answer you&apos;re looking for? Our friendly support team
              is here to help you 7 days a week.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contact Us
              </Link>
              <a
                href={`tel:${contact.phone.main.replace(/\s/g, '')}`}
                className="inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {contact.phone.main}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Explore {brand.country}?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Book your vehicle today and discover the beauty of {brand.countryNickname}.
          </p>
          <Link
            href="/vehicles"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            Browse Vehicles
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
