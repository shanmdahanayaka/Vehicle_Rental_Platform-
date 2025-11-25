import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-blue-400 mb-4">RentWheels</h3>
            <p className="text-gray-400">
              Your trusted partner for vehicle rentals. Quality cars, competitive
              prices, and exceptional service.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/vehicles" className="text-gray-400 hover:text-white transition">
                  Browse Vehicles
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Vehicle Types</h4>
            <ul className="space-y-2">
              <li className="text-gray-400">Cars</li>
              <li className="text-gray-400">SUVs</li>
              <li className="text-gray-400">Vans</li>
              <li className="text-gray-400">Luxury</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-gray-400">
              <li>support@rentwheels.com</li>
              <li>+1 (555) 123-4567</li>
              <li>123 Rental Street</li>
              <li>City, State 12345</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} RentWheels. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
