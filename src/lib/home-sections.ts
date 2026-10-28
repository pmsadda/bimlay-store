import "server-only";

import { db } from "@/lib/db";

export async function getHomeSections(activeOnly = true) {
  return db.homeSection.findMany({
    where: activeOnly ? { isActive: true } : {},
    select: {
      key: true,
      eyebrow: true,
      title: true,
      description: true,
      imageUrl: true,
      mobileImageUrl: true,
      altText: true,
      buttonText: true,
      buttonHref: true,
      isActive: true,
    },
  });
}

export type HomeSectionData = Awaited<
  ReturnType<typeof getHomeSections>
>[number];