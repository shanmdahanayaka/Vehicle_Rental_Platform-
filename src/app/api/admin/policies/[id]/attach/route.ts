import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// POST /api/admin/policies/[id]/attach - Attach policy to vehicles or packages
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id: policyId } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { vehicleIds, packageIds } = body;

    // Check if policy exists
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const results: { vehicles: number; packages: number } = { vehicles: 0, packages: 0 };

    // Attach to vehicles
    if (vehicleIds && Array.isArray(vehicleIds)) {
      // Remove existing vehicle attachments
      await prisma.vehiclePolicy.deleteMany({
        where: { policyId },
      });

      // Create new attachments
      if (vehicleIds.length > 0) {
        await prisma.vehiclePolicy.createMany({
          data: vehicleIds.map((vehicleId: string) => ({
            vehicleId,
            policyId,
          })),
          skipDuplicates: true,
        });
        results.vehicles = vehicleIds.length;
      }
    }

    // Attach to packages
    if (packageIds && Array.isArray(packageIds)) {
      // Remove existing package attachments
      await prisma.packagePolicy.deleteMany({
        where: { policyId },
      });

      // Create new attachments
      if (packageIds.length > 0) {
        await prisma.packagePolicy.createMany({
          data: packageIds.map((packageId: string) => ({
            packageId,
            policyId,
          })),
          skipDuplicates: true,
        });
        results.packages = packageIds.length;
      }
    }

    return NextResponse.json({
      message: "Policy attachments updated",
      attached: results,
    });
  } catch (error) {
    console.error("Error attaching policy:", error);
    return NextResponse.json(
      { error: "Failed to attach policy" },
      { status: 500 }
    );
  }
}
