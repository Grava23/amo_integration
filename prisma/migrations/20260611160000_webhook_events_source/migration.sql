-- AlterTable
ALTER TABLE "lead_stage_events" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "lead_stage_events" ALTER COLUMN "lead_id" DROP NOT NULL;
