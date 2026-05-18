import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getActiveAuthFromRequest, errorResponse, successResponse } from "@/lib/api-helpers";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function hasValidImageSignature(buffer: Buffer, type: string) {
  if (type === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (type === "image/png") {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (type === "image/webp") {
    return buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  if (type === "image/gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveAuthFromRequest(request);
    if (!auth) return errorResponse("Not authenticated", 401);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("No file uploaded", 400);
    }

    const extension = ALLOWED_IMAGE_TYPES[file.type];
    if (!extension) {
      return errorResponse("Invalid file type. Please upload a JPG, PNG, WEBP, or GIF image.", 400);
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return errorResponse("File must be smaller than 5 MB", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!hasValidImageSignature(buffer, file.type)) {
      return errorResponse("Uploaded file content does not match the declared image type", 400);
    }

    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${randomUUID()}.${extension}`;
    const path = join(uploadDir, filename);

    await writeFile(path, buffer, { flag: "wx" });

    return successResponse({ fileUrl: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to upload file", 500);
  }
}
