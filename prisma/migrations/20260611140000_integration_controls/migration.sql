-- AlterTable
ALTER TABLE "integration_settings" ADD COLUMN "priority_open_status_id" INTEGER;
ALTER TABLE "integration_settings" ADD COLUMN "comment_template" TEXT;

-- CreateTable
CREATE TABLE "lead_stage_events" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "status_id" INTEGER,
    "pipeline_id" INTEGER,
    "responsible_user_id" INTEGER,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_stage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_stage_events_domain_created_at_idx" ON "lead_stage_events"("domain", "created_at");
