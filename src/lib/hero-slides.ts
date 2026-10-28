import "server-only";

import { db } from "@/lib/db";

export async function getHeroSlides(activeOnly = true) {
  return db.heroSlide.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      eyebrow: true,
      title: true,
      subtitle: true,
      desktopImage: true,
      mobileImage: true,
      altText: true,
      buttonText: true,
      buttonHref: true,
      sortOrder: true,
      isActive: true,
    },
  });
}

export type HeroSlideData = Awaited<
  ReturnType<typeof getHeroSlides>
>[number];