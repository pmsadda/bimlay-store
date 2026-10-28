import { connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await connection();

  try {
    const settings = await db.storeSetting.findUnique({
      where: { id: "main" },
      select: {
        whatsappNumber: true,
        facebookPageUrl: true,
        supportEmail: true,
      },
    });

    return Response.json(
      {
        whatsappNumber: settings?.whatsappNumber ?? "",
        facebookPageUrl: settings?.facebookPageUrl ?? "",
        supportEmail: settings?.supportEmail ?? "",
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Contact information is temporarily unavailable." },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}