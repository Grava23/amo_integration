-- AlterTable: статичный Bearer-токен amoCRM per-domain (как в n8n)
ALTER TABLE "integrations" ADD COLUMN "amo_api_token" TEXT;

-- AlterTable: ID ИИ-воронки per-domain (воронка/этапы/ответственный/кастом-поле)
ALTER TABLE "integration_settings" ADD COLUMN "ai_pipeline_id" INTEGER;
ALTER TABLE "integration_settings" ADD COLUMN "ai_trigger_status_id" INTEGER;
ALTER TABLE "integration_settings" ADD COLUMN "ai_responsible_user_id" INTEGER;
ALTER TABLE "integration_settings" ADD COLUMN "ai_start_time_field_id" INTEGER;
ALTER TABLE "integration_settings" ADD COLUMN "autoblock_status_id" INTEGER;
ALTER TABLE "integration_settings" ADD COLUMN "handoff_status_id" INTEGER;
ALTER TABLE "integration_settings" ADD COLUMN "success_status_id" INTEGER;
