import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { getAdmin } from "@/lib/admin-auth";
import { saveMediaImage } from "@/lib/media-storage";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

class UploadTooLargeError extends Error {}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Direct/same-origin server-side request

  // Render Environment Variable চেক
  if (process.env.APP_ORIGIN && origin === process.env.APP_ORIGIN) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const hostHeader =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      new URL(request.url).host;

    // একই হোস্টের রিকোয়েস্ট হলে এলাউ করবে
    if (originUrl.host === hostHeader) {
      return true;
    }

    // bimlay.com এবং এর সাবডোমেইন এলাউ করতে
    if (
      originUrl.hostname === "bimlay.com" ||
      originUrl.hostname.endsWith(".bimlay.com") ||
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1" ||
      originUrl.hostname.endsWith(".onrender.com")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function readLimitedFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new Error("Invalid upload request.");
  }

  const declaredSize = Number(request.headers.get("content-length") ?? 0);

  if (declaredSize > MAX_REQUEST_BYTES) {
    throw new UploadTooLargeError();
  }

  if (!request.body) {
    throw new Error("Missing upload body.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      total += value.byteLength;

      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new UploadTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Response(body.buffer, {
    headers: {
      "Content-Type": contentType,
    },
  }).formData();
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json(
      { error: "Upload origin is not allowed." },
      { status: 403 },
    );
  }

  const admin = await getAdmin();

  if (!admin || admin.role !== "OWNER") {
    return Response.json(
      { error: "Owner login is required." },
      { status: 403 },
    );
  }

  let formData: FormData;

  try {
    formData = await readLimitedFormData(request);
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      return Response.json(
        { error: "Upload is too large. Choose an image under 8 MB." },
        { status: 413 },
      );
    }

    return Response.json(
      { error: "Invalid upload request." },
      { status: 400 },
    );
  }

  const images = formData.getAll("image");
  const file = images[0];

  if (images.length !== 1 || !(file instanceof File)) {
    return Response.json(
      { error: "Choose one image." },
      { status: 400 },
    );
  }

  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: "Image must be smaller than 8 MB and not empty." },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json(
      { error: "Only JPG, PNG and WebP images are supported." },
      { status: 400 },
    );
  }

  let processed: {
    data: Buffer;
    info: OutputInfo;
  };

  try {
    const input = Buffer.from(await file.arrayBuffer());

    const metadata = await sharp(input, {
      limitInputPixels: MAX_PIXELS,
    }).metadata();

    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1
    ) {
      return Response.json(
        { error: "Choose a valid, non-animated JPG, PNG or WebP image." },
        { status: 400 },
      );
    }

    processed = await sharp(input, {
      limitInputPixels: MAX_PIXELS,
    })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return Response.json(
      {
        error:
          "This image could not be processed. Choose a valid image under 40 megapixels.",
      },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.webp`;

  try {
    await saveMediaImage(filename, processed.data);
  } catch {
    return Response.json(
      { error: "Could not save the image. Please try again." },
      { status: 500 },
    );
  }

  return Response.json(
    {
      url: `/media/${filename}`,
      width: processed.info.width,
      height: processed.info.height,
      bytes: processed.info.size,
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}