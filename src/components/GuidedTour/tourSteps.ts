import { TourStep } from "./index";

// Admin Dashboard Tour Steps
export const adminTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Admin Dashboard!",
    content: "Let's take a quick tour to help you get familiar with the admin panel. This tour will guide you through all the key features.",
    position: "center",
    spotlight: false,
  },
  {
    id: "dashboard-stats",
    target: "[data-tour='stats-cards']",
    title: "Quick Statistics",
    content: "Here you can see key metrics at a glance - total revenue, bookings, vehicles, and users. The cards show real-time data from your system.",
    position: "bottom",
  },
  {
    id: "analytics",
    target: "[data-tour='analytics']",
    title: "Analytics Dashboard",
    content: "View detailed analytics including revenue trends, booking patterns, and performance metrics. Use these insights to make data-driven decisions.",
    position: "top",
  },
  {
    id: "recent-bookings",
    target: "[data-tour='recent-bookings']",
    title: "Recent Bookings",
    content: "Quickly see the latest bookings with customer details, vehicle info, and payment status. Click 'View All' to manage all bookings.",
    position: "left",
  },
  {
    id: "quick-actions",
    target: "[data-tour='quick-actions']",
    title: "Quick Actions",
    content: "Access frequently used features quickly - manage bookings, add vehicles, view users, and check invoices all from one place.",
    position: "left",
  },
  {
    id: "sidebar-nav",
    target: "[data-tour='sidebar']",
    title: "Navigation Menu",
    content: "Use the sidebar to navigate between different sections: Dashboard, Bookings, Vehicles, Users, Packages, Policies, Invoices, and Permissions.",
    position: "right",
  },
  {
    id: "bookings-menu",
    target: "[data-tour='nav-bookings']",
    title: "Bookings Management",
    content: "Manage all vehicle bookings here. You can confirm bookings, process collections, handle returns, and create invoices.",
    position: "right",
  },
  {
    id: "vehicles-menu",
    target: "[data-tour='nav-vehicles']",
    title: "Vehicle Fleet",
    content: "Add, edit, and manage your vehicle fleet. Set pricing, availability, and upload vehicle images.",
    position: "right",
  },
  {
    id: "invoices-menu",
    target: "[data-tour='nav-invoices']",
    title: "Invoice Management",
    content: "View and manage all invoices. Track payments, send invoices via email or WhatsApp, and monitor outstanding balances.",
    position: "right",
  },
  {
    id: "packages-menu",
    target: "[data-tour='nav-packages']",
    title: "Packages",
    content: "Create and manage rental packages with add-ons like GPS, child seats, or insurance options that customers can select during booking.",
    position: "right",
  },
  {
    id: "permissions-menu",
    target: "[data-tour='nav-permissions']",
    title: "Permissions & Audit",
    content: "Manage user roles and permissions. View audit logs to track all system activities. Only Super Admins can modify permissions.",
    position: "right",
  },
  {
    id: "complete",
    title: "You're All Set!",
    content: "You've completed the admin tour! You can restart this tour anytime from your profile settings. If you need help, check the documentation or contact support.",
    position: "center",
    spotlight: false,
  },
];

// User Dashboard Tour Steps
export const userTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Our Vehicle Rental Platform!",
    content: "Let's show you around! This quick tour will help you understand how to browse vehicles, make bookings, and manage your rentals.",
    position: "center",
    spotlight: false,
  },
  {
    id: "browse-vehicles",
    target: "[data-tour='vehicles-link']",
    title: "Browse Vehicles",
    content: "Click here to explore our complete fleet. Filter by type, brand, price range, and features to find your perfect vehicle.",
    position: "bottom",
  },
  {
    id: "search",
    target: "[data-tour='search']",
    title: "Quick Search",
    content: "Use the search bar to quickly find vehicles by name, brand, or type. Save time by searching directly!",
    position: "bottom",
  },
  {
    id: "packages",
    target: "[data-tour='packages-link']",
    title: "Rental Packages",
    content: "Check out our special packages! Add extras like GPS navigation, child seats, or premium insurance to your booking.",
    position: "bottom",
  },
  {
    id: "favorites",
    target: "[data-tour='favorites-link']",
    title: "Your Favorites",
    content: "Save vehicles you like to your favorites list. Makes it easy to compare and book your preferred vehicles later.",
    position: "bottom",
  },
  {
    id: "cart",
    target: "[data-tour='cart-link']",
    title: "Your Cart",
    content: "Review your selected vehicles and packages here before proceeding to checkout.",
    position: "bottom",
  },
  {
    id: "bookings",
    target: "[data-tour='bookings-link']",
    title: "My Bookings",
    content: "View all your bookings - past, current, and upcoming. Track booking status, view invoices, and manage your rentals.",
    position: "bottom",
  },
  {
    id: "notifications",
    target: "[data-tour='notifications']",
    title: "Stay Updated",
    content: "Get real-time notifications about your bookings, promotions, and important updates. Never miss an update!",
    position: "bottom",
  },
  {
    id: "profile",
    target: "[data-tour='profile']",
    title: "Your Profile",
    content: "Manage your account settings, update personal info, and change preferences from your profile.",
    position: "left",
  },
  {
    id: "chat",
    target: "[data-tour='chat-link']",
    title: "Live Chat Support",
    content: "Need help? Chat with our support team in real-time. We're here to assist you with any questions.",
    position: "bottom",
  },
  {
    id: "complete",
    title: "Ready to Roll!",
    content: "That's it! You're ready to explore and book your perfect vehicle. Start browsing our fleet and enjoy your rental experience!",
    position: "center",
    spotlight: false,
  },
];

// Get tour steps based on user role
export function getTourSteps(role?: string): TourStep[] {
  if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER") {
    return adminTourSteps;
  }
  return userTourSteps;
}
