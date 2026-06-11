-- CreateTable
CREATE TABLE "integration_settings" (
    "domain" TEXT NOT NULL,
    "target_status_id" INTEGER,
    "target_pipeline_id" INTEGER,
    "target_responsible_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("domain")
);

-- AddForeignKey
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_domain_fkey" FOREIGN KEY ("domain") REFERENCES "integrations"("domain") ON DELETE CASCADE ON UPDATE CASCADE;
