import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  cloudinaryImageUrl,
  MEDIA_FILENAME_PATTERN,
  PRODUCT_MEDIA_DIR,
} from "@/lib/media-storage";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ filename: string }>;
  },
) {
  const { filename } = await context.params;

  if (!MEDIA_FILENAME_PATTERN.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const remoteUrl = cloudinaryImageUrl(filename);

  if (remoteUrl) {
    return Response.redirect(remoteUrl, 302);
  }

  try {
    const image = await readFile(
      path.join(PRODUCT_MEDIA_DIR, filename),
    );

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return new Response("Not found", { status: 404 });
    }

    return new Response("Image temporarily unavailable", {
      status: 500,
    });
  }
}