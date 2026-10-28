-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "storeName" TEXT NOT NULL DEFAULT 'BIMLAY',
    "supportPhone" TEXT,
    "dhakaDeliveryCharge" DECIMAL(12,2) NOT NULL,
    "outsideDeliveryCharge" DECIMAL(12,2) NOT NULL,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);
