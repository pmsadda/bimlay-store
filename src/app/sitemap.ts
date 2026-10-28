import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";

const SITE_URL = "https://bimlay.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      category: {
        isActive: true,
        OR: [
          { parentId: null },
          { parent: { isActive: true } },
        ],
      },
      images: {
        some: {},
      },
      variants: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 49000,
  });

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/shop`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...products.map((product) => ({
      url: `${SITE_URL}/products/${encodeURIComponent(product.slug)}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}