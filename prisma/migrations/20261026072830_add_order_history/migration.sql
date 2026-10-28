-- CreateTable
CREATE TABLE "OrderAudit" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "adminId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "fromValue" TEXT NOT NULL,
    "toValue" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAudit_orderId_createdAt_idx" ON "OrderAudit"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderAudit_adminId_idx" ON "OrderAudit"("adminId");

-- AddForeignKey
ALTER TABLE "OrderAudit" ADD CONSTRAINT "OrderAudit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAudit" ADD CONSTRAINT "OrderAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
