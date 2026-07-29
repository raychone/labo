-- CreateTable
CREATE TABLE "legal_entity_settings" (
    "id" TEXT NOT NULL,
    "legal_entity_id" TEXT NOT NULL,
    "legal_name" VARCHAR(160) NOT NULL,
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
    "iban" VARCHAR(34),
    "bank_name" VARCHAR(120),
    "primary_color" CHAR(7) NOT NULL DEFAULT '#0f766e',
    "logo_file_key" VARCHAR(512),
    "document_footer" VARCHAR(500),
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_entity_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "legal_entity_settings_country_code_check" CHECK ("country_code" = 'RO'),
    CONSTRAINT "legal_entity_settings_timezone_check" CHECK ("timezone" = 'Europe/Bucharest'),
    CONSTRAINT "legal_entity_settings_locale_check" CHECK ("locale" = 'ro-RO'),
    CONSTRAINT "legal_entity_settings_currency_check" CHECK ("currency" = 'RON'),
    CONSTRAINT "legal_entity_settings_primary_color_check" CHECK ("primary_color" ~ '^#[0-9a-f]{6}$')
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_entity_settings_legal_entity_id_key" ON "legal_entity_settings"("legal_entity_id");

-- CreateIndex
CREATE INDEX "legal_entity_settings_updated_by_user_id_idx" ON "legal_entity_settings"("updated_by_user_id");

-- Ensure the previously introduced registry exists in deterministic fresh local migrations.
INSERT INTO "legal_entities" ("id", "code", "display_name", "is_active", "sort_order", "created_at", "updated_at")
VALUES
    ('legal_entity_nc', 'NC', 'Nicolaie Cristina', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('legal_entity_ng', 'NG', 'Nicolaie Gabriel', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET
    "display_name" = EXCLUDED."display_name",
    "is_active" = true,
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP;

-- Backfill missing company-aware settings from the legacy singleton for development compatibility.
INSERT INTO "legal_entity_settings" (
    "id",
    "legal_entity_id",
    "legal_name",
    "company_registration_number",
    "tax_id",
    "email",
    "phone",
    "website",
    "address_line_1",
    "address_line_2",
    "city",
    "county_or_region",
    "postal_code",
    "country_code",
    "timezone",
    "locale",
    "currency",
    "primary_color",
    "logo_file_key",
    "document_footer",
    "updated_by_user_id",
    "created_at",
    "updated_at"
)
SELECT
    'legal_entity_settings_' || lower(le."code"),
    le."id",
    COALESCE(NULLIF(ls."legal_name", ''), le."display_name"),
    ls."company_registration_number",
    ls."tax_id",
    ls."email",
    ls."phone",
    ls."website",
    ls."address_line_1",
    ls."address_line_2",
    ls."city",
    ls."county_or_region",
    ls."postal_code",
    'RO',
    'Europe/Bucharest',
    'ro-RO',
    'RON',
    COALESCE(NULLIF(ls."primary_color", ''), '#0f766e'),
    ls."logo_file_key",
    ls."document_footer",
    ls."updated_by_user_id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "legal_entities" le
LEFT JOIN "laboratory_settings" ls ON ls."key" = 'default'
WHERE le."code" IN ('NC', 'NG')
ON CONFLICT ("legal_entity_id") DO NOTHING;

-- AddForeignKey
ALTER TABLE "legal_entity_settings" ADD CONSTRAINT "legal_entity_settings_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_entity_settings" ADD CONSTRAINT "legal_entity_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
