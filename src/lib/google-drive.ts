import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Google Drive configuration
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

let driveClientCache: drive_v3.Drive | null = null;

// Parse the private key from various formats and ensure proper PEM format
function parsePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;

  let parsed = key;

  // Remove surrounding quotes if present
  if ((parsed.startsWith('"') && parsed.endsWith('"')) ||
      (parsed.startsWith("'") && parsed.endsWith("'"))) {
    parsed = parsed.slice(1, -1);
  }

  // Replace escaped newlines with real newlines
  parsed = parsed.replace(/\\n/g, "\n");

  // If it's a JSON string with escaped quotes, unescape them
  parsed = parsed.replace(/\\"/g, '"');

  // Ensure proper line endings
  parsed = parsed.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return parsed;
}

// Validate that the private key can be loaded
function validatePrivateKey(key: string): boolean {
  try {
    crypto.createPrivateKey({
      key: key,
      format: 'pem',
    });
    return true;
  } catch {
    return false;
  }
}

// Initialize Google Drive client using GoogleAuth (more compatible with OpenSSL 3.0)
async function getGoogleDriveClientAsync(): Promise<drive_v3.Drive> {
  if (driveClientCache) {
    return driveClientCache;
  }

  // Option 1: Try to load from JSON key file (most reliable for OpenSSL 3.0)
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFilePath && fs.existsSync(keyFilePath)) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: SCOPES,
      });
      driveClientCache = google.drive({ version: "v3", auth });
      console.log("Google Drive client initialized with key file");
      return driveClientCache;
    } catch (e) {
      console.warn("Failed to load key file, trying environment variables:", e);
    }
  }

  // Option 2: Try credentials from environment using GoogleAuth
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = parsePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google Drive credentials not configured. Either set GOOGLE_APPLICATION_CREDENTIALS to a JSON key file path, " +
      "or set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables."
    );
  }

  // Validate key before using
  if (!validatePrivateKey(privateKey)) {
    console.warn("Private key validation failed, attempting to use anyway...");
  }

  // Use GoogleAuth with credentials object (better OpenSSL 3.0 compatibility)
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });

  driveClientCache = google.drive({ version: "v3", auth });
  console.log("Google Drive client initialized with environment credentials");
  return driveClientCache;
}

// Synchronous wrapper that returns cached client or throws
function getGoogleDriveClient(): drive_v3.Drive {
  if (driveClientCache) {
    return driveClientCache;
  }

  // For synchronous access, we need to initialize first
  // This will be called after async initialization in upload functions
  throw new Error("Google Drive client not initialized. Call getGoogleDriveClientAsync first.");
}

// Get the folder ID from environment or config
function getFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      "Google Drive folder ID not configured. Please set GOOGLE_DRIVE_FOLDER_ID"
    );
  }
  return folderId;
}

// Convert buffer to readable stream
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Get MIME type from file extension
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  directLink?: string;
  thumbnailLink?: string;
  error?: string;
}

export interface UploadOptions {
  filename: string;
  mimeType?: string;
  folderId?: string;
  makePublic?: boolean;
}

/**
 * Upload a file to Google Drive
 * @param fileBuffer - The file data as a Buffer
 * @param options - Upload options including filename and optional folder
 * @returns Upload result with links to the file
 */
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const drive = await getGoogleDriveClientAsync();
    const folderId = options.folderId || getFolderId();
    const mimeType = options.mimeType || getMimeType(options.filename);

    // Create file metadata
    const fileMetadata = {
      name: options.filename,
      parents: [folderId],
    };

    // Create media with buffer stream
    const media = {
      mimeType,
      body: bufferToStream(fileBuffer),
    };

    // Upload the file
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink, webContentLink, thumbnailLink",
    });

    const fileId = response.data.id;

    if (!fileId) {
      return { success: false, error: "Failed to get file ID after upload" };
    }

    // Make file publicly accessible if requested (default: true for article images)
    if (options.makePublic !== false) {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    }

    // Generate direct link for embedding
    const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return {
      success: true,
      fileId,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
      directLink,
      thumbnailLink: response.data.thumbnailLink || undefined,
    };
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Upload multiple files to Google Drive
 * @param files - Array of file buffers with metadata
 * @returns Array of upload results
 */
export async function uploadMultipleToGoogleDrive(
  files: Array<{ buffer: Buffer; options: UploadOptions }>
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file) => uploadToGoogleDrive(file.buffer, file.options))
  );
  return results;
}

/**
 * Delete a file from Google Drive
 * @param fileId - The Google Drive file ID
 * @returns Success status
 */
export async function deleteFromGoogleDrive(
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const drive = await getGoogleDriveClientAsync();
    await drive.files.delete({ fileId });
    return { success: true };
  } catch (error) {
    console.error("Error deleting from Google Drive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Delete multiple files from Google Drive
 * @param fileIds - Array of Google Drive file IDs
 * @returns Array of deletion results
 */
export async function deleteMultipleFromGoogleDrive(
  fileIds: string[]
): Promise<Array<{ fileId: string; success: boolean; error?: string }>> {
  const results = await Promise.all(
    fileIds.map(async (fileId) => {
      const result = await deleteFromGoogleDrive(fileId);
      return { fileId, ...result };
    })
  );
  return results;
}

/**
 * Get file metadata from Google Drive
 * @param fileId - The Google Drive file ID
 * @returns File metadata or error
 */
export async function getFileMetadata(fileId: string): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    webViewLink: string;
    webContentLink: string;
  };
  error?: string;
}> {
  try {
    const drive = await getGoogleDriveClientAsync();
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, webViewLink, webContentLink",
    });

    return {
      success: true,
      data: {
        id: response.data.id || "",
        name: response.data.name || "",
        mimeType: response.data.mimeType || "",
        size: response.data.size || "0",
        webViewLink: response.data.webViewLink || "",
        webContentLink: response.data.webContentLink || "",
      },
    };
  } catch (error) {
    console.error("Error getting file metadata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Extract Google Drive file ID from various URL formats
 * @param url - Google Drive URL or direct link
 * @returns File ID or null
 */
export function extractFileIdFromUrl(url: string): string | null {
  if (!url) return null;

  // Match patterns:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/uc?export=view&id=FILE_ID
  // https://drive.google.com/open?id=FILE_ID

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it's already a file ID (no slashes or query params)
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Convert any Google Drive URL to a direct embed URL
 * @param url - Google Drive URL
 * @returns Direct embed URL
 */
export function toDirectUrl(url: string): string {
  const fileId = extractFileIdFromUrl(url);
  if (!fileId) return url;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Check if Google Drive is properly configured
 * @returns Configuration status
 */
export function isGoogleDriveConfigured(): boolean {
  // Check if folder ID is set
  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return false;
  }

  // Check if using JSON key file
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFilePath && fs.existsSync(keyFilePath)) {
    return true;
  }

  // Check if using environment variables
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}
