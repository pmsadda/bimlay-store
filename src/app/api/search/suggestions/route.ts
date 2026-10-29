import { connection } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  await connection();

  const query = new URL(request.url).searchParams
    .get("q")
    ?.trim()
    .slice(0, 100);

  if (!query || query.length < 2) {
    return Response.json(
      { items: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      category: {
        is: {
          isActive: true,
          OR: [
            { parentId: null },
            { parent: { is: { isActive: true } } },
          ],
        },
      },
      images: { some: {} },
      variants: { some: { isActive: true } },
      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          variants: {
            some: {
              isActive: true,
              sku: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 6,
    select: {
      id: true,
      name: true,
      slug: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, alt: true },
      },
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" },
        select: { price: true, stock: true },
      },
    },
  });

  return Response.json(
    {
      items: products.map((product) => {
        const variant =
          product.variants.find((item) => item.stock > 0) ??
          product.variants[0];

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images[0].url,
          imageAlt: product.images[0].alt,
          price: variant.price.toFixed(2),
          inStock: product.variants.some(
            (item) => item.stock > 0,
          ),
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}