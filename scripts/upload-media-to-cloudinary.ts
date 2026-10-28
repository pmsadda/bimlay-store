import "dotenv/config";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

const MEDIA_DIR = path.resolve(
  process.cwd(),
  "storage",
  "product-images",
);

const FILENAME_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/;

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}

function errorParts(error: unknown): Record<string, unknown>[] {
  if (!error || typeof error !== "object") {
    return [];
  }

  const outer = error as Record<string, unknown>;
  const parts = [outer];

  if (outer.error && typeof outer.error === "object") {
    parts.push(outer.error as Record<string, unknown>);
  }

  return parts;
}

function isNotFound(error: unknown): boolean {
  return errorParts(error).some((part) => {
    if (part.http_code === 404) return true;

    return (
      typeof part.message === "string" &&
      /^Resource not found\b/i.test(part.message)
    );
  });
}

async function main() {
  cloudinary.config({
    cloud_name: required("CLOUDINARY_CLOUD_NAME"),
    api_key: required("CLOUDINARY_API_KEY"),
    api_secret: required("CLOUDINARY_API_SECRET"),
    secure: true,
  });

  const filenames = (await readdir(MEDIA_DIR))
    .filter((filename) => FILENAME_PATTERN.test(filename))
    .sort();

  console.log(`Found ${filenames.length} local images.`);

  let uploaded = 0;
  let alreadyPresent = 0;

  for (const filename of filenames) {
    const publicId =
      `bimlay/${filename.slice(0, -".webp".length)}`;

    try {
      await cloudinary.api.resource(publicId, {
        resource_type: "image",
      });

      alreadyPresent++;
      console.log(`Already uploaded: ${filename}`);
      continue;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    const image = await readFile(
      path.join(MEDIA_DIR, filename),
    );

    const dataUri =
      `data:image/webp;base64,${image.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
      public_id: publicId,
      overwrite: false,
      unique_filename: false,
      format: "webp",
    });

    if (result.public_id !== publicId) {
      throw new Error(
        `Unexpected Cloudinary ID for ${filename}.`,
      );
    }

    uploaded++;
    console.log(`Uploaded: ${filename}`);
  }

  console.log(
    `Complete. Uploaded: ${uploaded}; already present: ${alreadyPresent}.`,
  );
}

void main().catch((error: unknown) => {
  const parts = errorParts(error);

  const code = parts.find(
    (part) => typeof part.http_code === "number",
  )?.http_code;

  const message = parts.find(
    (part) => typeof part.message === "string",
  )?.message;

  const safeMessage =
    typeof message === "string"
      ? message
          .replaceAll(
            process.env.CLOUDINARY_API_SECRET ?? "\u0000",
            "[REDACTED]",
          )
          .replaceAll(
            process.env.CLOUDINARY_API_KEY ?? "\u0000",
            "[REDACTED]",
          )
          .replace(/[\r\n]/g, " ")
          .slice(0, 200)
      : "No error message returned.";

  console.error("Cloudinary HTTP status:", code ?? "unknown");
  console.error("Reason:", safeMessage);
  process.exitCode = 1;
});