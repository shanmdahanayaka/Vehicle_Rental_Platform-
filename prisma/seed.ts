import { PrismaClient, VehicleType, Transmission, FuelType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@rentwheels.com" },
    update: {},
    create: {
      email: "admin@rentwheels.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user created:", admin.email);

  // Create sample vehicles
  const vehicles = [
    {
      name: "Toyota Camry 2024",
      brand: "Toyota",
      model: "Camry",
      year: 2024,
      type: VehicleType.CAR,
      transmission: Transmission.AUTOMATIC,
      fuelType: FuelType.PETROL,
      seats: 5,
      pricePerDay: 75,
      description: "Reliable and comfortable sedan, perfect for business trips and family outings.",
      images: JSON.stringify(["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800"]),
      location: "New York, NY",
      available: true,
      featured: true,
    },
    {
      name: "Honda CR-V 2024",
      brand: "Honda",
      model: "CR-V",
      year: 2024,
      type: VehicleType.SUV,
      transmission: Transmission.AUTOMATIC,
      fuelType: FuelType.HYBRID,
      seats: 5,
      pricePerDay: 95,
      description: "Spacious SUV with excellent fuel economy and advanced safety features.",
      images: JSON.stringify(["https://images.unsplash.com/photo-1568844293986-8c3a3d4e8b4e?w=800"]),
      location: "Los Angeles, CA",
      available: true,
      featured: true,
    },
    {
      name: "Tesla Model 3",
      brand: "Tesla",
      model: "Model 3",
      year: 2024,
      type: VehicleType.LUXURY,
      transmission: Transmission.AUTOMATIC,
      fuelType: FuelType.ELECTRIC,
      seats: 5,
      pricePerDay: 150,
      description: "Premium electric vehicle with autopilot and long range battery.",
      images: JSON.stringify(["https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800"]),
      location: "San Francisco, CA",
      available: true,
      featured: true,
    },
    {
      name: "Ford F-150 2024",
      brand: "Ford",
      model: "F-150",
      year: 2024,
      type: VehicleType.TRUCK,
      transmission: Transmission.AUTOMATIC,
      fuelType: FuelType.PETROL,
      seats: 5,
      pricePerDay: 110,
      description: "Powerful pickup truck perfect for hauling and outdoor adventures.",
      images: JSON.stringify(["https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800"]),
      location: "Dallas, TX",
      available: true,
      featured: false,
    },
    {
      name: "Mercedes-Benz S-Class",
      brand: "Mercedes-Benz",
      model: "S-Class",
      year: 2024,
      type: VehicleType.LUXURY,
      transmission: Transmission.AUTOMATIC,
      fuelType: FuelType.PETROL,
      seats: 5,
      pricePerDay: 250,
      description: "Ultimate luxury sedan with premium interior and cutting-edge technology.",
      images: JSON.stringify(["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"]),
      location: "Miami, FL",
      available: true,
      featured: true,
    },
    {
      name: "Chevrolet Express Van",
      brand: "Chevrolet",
      model: "Express",
      year: 2023,
      type: VehicleType.VAN,
      transmission: Transmission.AUTOMATIC,
      fuelType: FuelType.PETROL,
      seats: 12,
      pricePerDay: 130,
      description: "Spacious passenger van ideal for group transportation.",
      images: JSON.stringify(["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"]),
      location: "Chicago, IL",
      available: true,
      featured: false,
    },
  ];

  for (const vehicle of vehicles) {
    const created = await prisma.vehicle.upsert({
      where: {
        id: `seed-${vehicle.name.toLowerCase().replace(/\s+/g, '-')}`
      },
      update: vehicle,
      create: {
        id: `seed-${vehicle.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...vehicle,
      },
    });
    console.log("Vehicle created:", created.name);
  }

  console.log("\nSeed completed!");
  console.log("\nAdmin login credentials:");
  console.log("Email: admin@rentwheels.com");
  console.log("Password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
