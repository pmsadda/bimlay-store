import "server-only";

import { stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

export const PRODUCT_MEDIA_DIR = path.resolve(
  process.cwd(),
  "storage",
  "product-images",
);

export const MEDIA_FILENAME_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/;

function cloudinaryEnabled(): boolean {
  const mode = process.env.MEDIA_STORAGE ?? "local";

  if (mode !== "local" && mode !== "cloudinary") {
    throw new Error("MEDIA_STORAGE must be local or cloudinary.");
  }

  return mode === "cloudinary";
}

function cloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are missing.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

function publicId(filename: string): string {
  if (!MEDIA_FILENAME_PATTERN.test(filename)) {
    throw new Error("Invalid image filename.");
  }

  return `bimlay/${filename.slice(0, -".webp".length)}`;
}

export async function saveMediaImage(
  filename: string,
  image: Buffer,
): Promise<void> {
  if (!MEDIA_FILENAME_PATTERN.test(filename)) {
    throw new Error("Invalid image filename.");
  }

  if (!cloudinaryEnabled()) {
    await mkdir(PRODUCT_MEDIA_DIR, { recursive: true });

    await writeFile(
      path.join(PRODUCT_MEDIA_DIR, filename),
      image,
      { flag: "wx" },
    );

    return;
  }

  const client = cloudinaryClient();
  const expectedId = publicId(filename);

  await new Promise<void>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: expectedId,
        overwrite: false,
        unique_filename: false,
        format: "webp",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (!result || result.public_id !== expectedId) {
          reject(new Error("Unexpected image upload response."));
        } else {
          resolve();
        }
      },
    );

    stream.on("error", reject);
    stream.end(image);
  });
}

export function cloudinaryImageUrl(
  filename: string,
): string | null {
  if (!cloudinaryEnabled()) return null;

  const client = cloudinaryClient();

  return client.url(publicId(filename), {
    secure: true,
    format: "webp",
    resource_type: "image",
    type: "upload",
  });
}

export async function mediaImageExists(
  url: string,
): Promise<boolean> {
  if (!url.startsWith("/media/")) return false;

  const filename = url.slice("/media/".length);

  if (!MEDIA_FILENAME_PATTERN.test(filename)) {
    return false;
  }

  if (!cloudinaryEnabled()) {
    try {
      const file = await stat(
        path.join(PRODUCT_MEDIA_DIR, filename),
      );

      return file.isFile();
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return false;
      }

      throw error;
    }
  }

  try {
    await cloudinaryClient().api.resource(
      publicId(filename),
      { resource_type: "image" },
    );

    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "http_code" in error &&
      error.http_code === 404
    ) {
      return false;
    }

    throw error;
  }
}