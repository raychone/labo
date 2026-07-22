CREATE TABLE "laboratory_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "laboratory_name" VARCHAR(120) NOT NULL,
    "legal_name" VARCHAR(160),
    "company_registration_number" VARCHAR(80),
    "tax_id" VARCHAR(80),
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "website" VARCHAR(2048),
    "address_line_1" VARCHAR(160),
    "address_line_2" VARCHAR(160),
    "city" VARCHAR(100),
    "county_or_region" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country_code" CHAR(2) NOT NULL DEFAULT 'RO',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Bucharest',
    "locale" VARCHAR(12) NOT NULL DEFAULT 'ro-RO',
    "currency" CHAR(3) NOT NULL DEFAULT 'RON',
    "logo_file_key" VARCHAR(512),
    "primary_color" CHAR(7) NOT NULL DEFAULT '#0f766e',
    "document_footer" VARCHAR(500),
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratory_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "laboratory_settings_key_key" ON "laboratory_settings"("key");
CREATE INDEX "laboratory_settings_updated_by_user_id_idx" ON "laboratory_settings"("updated_by_user_id");

ALTER TABLE "laboratory_settings" ADD CONSTRAINT "laboratory_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
