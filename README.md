This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npx prisma push
npx prisma generate
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Technology Stack

  | Layer    | Technology                                     |
  |----------|------------------------------------------------|
  | Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
  | Backend  | Next.js API Routes                             |
  | Database | MySQL with Prisma ORM                          |
  | Auth     | NextAuth.js 5 (JWT strategy)                   |

  Current Stage: Mid-Development (MVP Foundation Complete)

  ---
  What's Implemented ✓

  User Features:
  - Registration/Login with credentials
  - Vehicle browsing with filters (type, location, price)
  - Booking creation with date conflict detection
  - Package selection (add-ons during booking)
  - Profile management & booking history
  - Reviews on vehicles

  Admin Features:
  - Dashboard with stats (revenue, bookings, vehicles, users)
  - Full CRUD for users, vehicles, bookings, packages, policies
  - Role-based access (USER → MANAGER → ADMIN → SUPER_ADMIN)
  - Granular permission system with user overrides
  - Audit logging of all actions

  Database Models (10 core):
  User, Vehicle, Booking, Payment, Review, Package, Policy, Permission, RolePermission, UserPermission, AuditLog

  ---
  What's Not Yet Implemented ✗

  - Payment gateway integration (Stripe/PayPal)
  - Email notifications/verification
  - Advanced reporting & analytics
  - Document upload (driver's license)
  - Two-factor authentication
  - Test suite

  ---
  Seed Data

  - 1 Admin user: admin@rentwheels.com / admin123
  - 6 Sample vehicles (Toyota, Honda, Tesla, Ford, Mercedes, Chevrolet)

  ---
  Project Structure

  src/
  ├── app/           # Next.js App Router
  │   ├── (auth)/    # Login/Register pages
  │   ├── admin/     # Admin dashboard & management
  │   ├── api/       # 19 REST API endpoints
  │   ├── vehicles/  # Vehicle browse/detail
  │   └── bookings/  # User bookings
  ├── components/    # UI components (Navbar, VehicleCard, admin tables)
  ├── lib/           # Auth, Prisma, Permissions, Audit utilities
  └── types/         # TypeScript definitions
  prisma/
  ├── schema.prisma  # Complete database schema
  └── seed.ts        # Database seeding

  The project has a solid foundation with comprehensive backend logic, working auth/permissions, and admin functionality.        
  Main gaps are payment integration, email systems, and UI polish.




● Guide to Create Pusher Account & Get Credentials

  Step 1: Create Account

  1. Go to https://pusher.com
  2. Click "Sign up" (top right)
  3. You can sign up with:
    - GitHub account
    - Google account
    - Email & password

  Step 2: Create a Channels App

  After signing in:

  1. You'll land on the Dashboard
  2. Click "Channels" in the left sidebar (or "Get Started" under Channels)
  3. Click "Create app" button
  4. Fill in the form:
    - App name: vehicle-rental-platform (or any name you prefer)
    - Cluster: Select the closest to your users (e.g., us2 for US East, eu for Europe, ap1 for Asia)
    - Tech stack: Select React for front-end and Node.js for back-end (optional, just for docs suggestions)
  5. Click "Create app"

  Step 3: Get Your Credentials

  After creating the app:

  1. Go to "App Keys" tab (in your app's page)
  2. You'll see these credentials:

  app_id:    1234567
  key:       a1b2c3d4e5f6g7h8i9j0
  secret:    z9y8x7w6v5u4t3s2r1q0
  cluster:   us2

  Step 4: Update Your .env File

  Copy these values to your .env file:

  PUSHER_APP_ID="1234567"
  PUSHER_SECRET="z9y8x7w6v5u4t3s2r1q0"
  NEXT_PUBLIC_PUSHER_KEY="a1b2c3d4e5f6g7h8i9j0"
  NEXT_PUBLIC_PUSHER_CLUSTER="us2"

  Step 5: Enable Client Events (Optional but Recommended)

  For typing indicators to work properly:

  1. Go to "App Settings" tab
  2. Enable "Enable client events"
  3. Click "Update"

  Free Tier Limits

  Pusher's free "Sandbox" plan includes:
  - 200,000 messages/day
  - 100 max concurrent connections
  - Unlimited channels

  This is plenty for development and small production apps.

  ---
  Once you have your credentials, let me know and I can help you:
  1. Run the database migration
  2. Test the real-time features


  Next Steps:

  1. Create a Pusher account at https://pusher.com and get your credentials
  2. Run npx prisma migrate dev to apply the new database models
  3. Update .env with your actual Pusher credentials
  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest  