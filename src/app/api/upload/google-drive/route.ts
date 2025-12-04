import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  uploadToGoogleDrive,
  uploadMultipleToGoogleDrive,
  isGoogleDriveConfigured,
} from "@/lib/google-drive";
import * as fs from "fs";
import * as path from "path";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN", "MANAGER"];

async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// Fallback: Upload to local public/uploads folder
async function uploadToLocal(buffer: Buffer, filename: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "articles");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    return {
      success: true,
      url: `/uploads/articles/${filename}`,
    };
  } catch (error) {
    console.error("Error uploading to local:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Local upload failed",
    };
  }
}

// POST /api/upload/google-drive - Upload single file
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;

    // Try Google Drive first if configured
    if (isGoogleDriveConfigured()) {
      try {
        const result = await uploadToGoogleDrive(buffer, {
          filename,
          mimeType: file.type,
          makePublic: true,
        });

        if (result.success) {
          return NextResponse.json({
            success: true,
            fileId: result.fileId,
            url: result.directLink,
            webViewLink: result.webViewLink,
            thumbnailLink: result.thumbnailLink,
          });
        }
        console.warn("Google Drive upload failed, falling back to local:", result.error);
      } catch (gdError) {
        console.warn("Google Drive error, falling back to local storage:", gdError);
      }
    }

    // Fallback to local storage
    const localResult = await uploadToLocal(buffer, filename);

    if (!localResult.success) {
      return NextResponse.json(
        { error: localResult.error || "Upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: localResult.url,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// PUT /api/upload/google-drive - Upload multiple files
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert all files to upload format
    const uploadFiles = await Promise.all(
      files.map(async (file, index) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const timestamp = Date.now() + index; // Ensure unique timestamps
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${timestamp}-${originalName}`;

        return { buffer, filename, mimeType: file.type };
      })
    );

    const successfulUploads: Array<{ url: string; fileId?: string }> = [];
    const failedUploads: string[] = [];

    // Try Google Drive first if configured
    const useGoogleDrive = isGoogleDriveConfigured();

    for (const file of uploadFiles) {
      let uploaded = false;

      if (useGoogleDrive) {
        try {
          const result = await uploadToGoogleDrive(file.buffer, {
            filename: file.filename,
            mimeType: file.mimeType,
            makePublic: true,
          });

          if (result.success) {
            successfulUploads.push({
              fileId: result.fileId,
              url: result.directLink!,
            });
            uploaded = true;
          }
        } catch (e) {
          console.warn("Google Drive upload failed for file:", file.filename);
        }
      }

      // Fallback to local if Google Drive failed or not configured
      if (!uploaded) {
        const localResult = await uploadToLocal(file.buffer, file.filename);
        if (localResult.success) {
          successfulUploads.push({ url: localResult.url! });
        } else {
          failedUploads.push(localResult.error || "Upload failed");
        }
      }
    }

    return NextResponse.json({
      success: failedUploads.length === 0,
      uploads: successfulUploads,
      errors: failedUploads.length > 0 ? failedUploads : undefined,
    });
  } catch (error) {
    console.error("Error uploading multiple files:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
