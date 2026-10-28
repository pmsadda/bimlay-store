-- CreateEnum
CREATE TYPE "HomeSectionKey" AS ENUM ('FOR_HIM', 'FOR_HER', 'STORY');

-- CreateTable
CREATE TABLE "HomeSection" (
    "key" "HomeSectionKey" NOT NULL,
    "eyebrow" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "mobileImageUrl" TEXT,
    "altText" TEXT NOT NULL DEFAULT '',
    "buttonText" TEXT NOT NULL,
    "buttonHref" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("key")
);
