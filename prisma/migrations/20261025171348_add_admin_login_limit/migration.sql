-- CreateTable
CREATE TABLE "AdminLoginLimit" (
    "id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminLoginLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLoginLimit_expiresAt_idx" ON "AdminLoginLimit"("expiresAt");
