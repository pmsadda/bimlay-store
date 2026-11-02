import { NextResponse, connection } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import {
  MEDIA_FILENAME_PATTERN,
  PRODUCT_MEDIA_DIR,
} from "@/lib/media-storage";

function cloudinaryEnabled(): boolean {
  return process.env.MEDIA_STORAGE === "cloudinary";
}

function cloudinaryClient() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
   await connection();
  const { filename } = await context.params;

  // ১. Filename validate — path traversal বা arbitrary file পড়া আটকাতে
  if (!MEDIA_FILENAME_PATTERN.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // ২. Cloudinary mode হলে সেখান থেকে redirect
  if (cloudinaryEnabled()) {
    const publicId = `bimlay/${filename.slice(0, -".webp".length)}`;
    const url = cloudinaryClient().url(publicId, {
      secure: true,
      format: "webp",
      resource_type: "image",
      type: "upload",
    });

    return NextResponse.redirect(url, {
      headers: {
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  }

  // ৩. Local mode — storage/product-images/ থেকে পড়ো
  const filePath = path.join(PRODUCT_MEDIA_DIR, filename);

  try {
    const buffer = await readFile(filePath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(buffer.length),
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse("Internal error", { status: 500 });
  }
}