CREATE SEQUENCE "clinic_code_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE "clinics" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "legal_name" VARCHAR(160),
  "tax_id" VARCHAR(80),
  "registration_number" VARCHAR(80),
  "email" VARCHAR(254),
  "phone" VARCHAR(40),
  "website" VARCHAR(2048),
  "contact_person_name" VARCHAR(120),
  "contact_person_role" VARCHAR(80),
  "contact_person_email" VARCHAR(254),
  "contact_person_phone" VARCHAR(40),
  "address_line_1" VARCHAR(160),
  "address_line_2" VARCHAR(160),
  "city" VARCHAR(100),
  "county_or_region" VARCHAR(100),
  "postal_code" VARCHAR(20),
  "country_code" CHAR(2) NOT NULL DEFAULT 'RO',
  "billing_name" VARCHAR(160),
  "billing_tax_id" VARCHAR(80),
  "billing_registration_number" VARCHAR(80),
  "billing_address_line_1" VARCHAR(160),
  "billing_address_line_2" VARCHAR(160),
  "billing_city" VARCHAR(100),
  "billing_county_or_region" VARCHAR(100),
  "billing_postal_code" VARCHAR(20),
  "billing_country_code" CHAR(2) NOT NULL DEFAULT 'RO',
  "internal_notes" VARCHAR(2000),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doctors" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "first_name" VARCHAR(80) NOT NULL,
  "last_name" VARCHAR(80) NOT NULL,
  "display_name" VARCHAR(180) NOT NULL,
  "email" VARCHAR(254),
  "phone" VARCHAR(40),
  "professional_code" VARCHAR(80),
  "internal_notes" VARCHAR(2000),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinics_code_key" ON "clinics"("code");
CREATE INDEX "clinics_name_idx" ON "clinics"("name");
CREATE INDEX "clinics_city_idx" ON "clinics"("city");
CREATE INDEX "clinics_is_active_idx" ON "clinics"("is_active");
CREATE INDEX "clinics_created_at_idx" ON "clinics"("created_at");
CREATE INDEX "clinics_tax_id_idx" ON "clinics"("tax_id");
CREATE INDEX "clinics_created_by_user_id_idx" ON "clinics"("created_by_user_id");
CREATE INDEX "clinics_updated_by_user_id_idx" ON "clinics"("updated_by_user_id");
CREATE INDEX "clinics_archived_by_user_id_idx" ON "clinics"("archived_by_user_id");
CREATE INDEX "doctors_clinic_id_idx" ON "doctors"("clinic_id");
CREATE INDEX "doctors_clinic_id_is_active_idx" ON "doctors"("clinic_id", "is_active");
CREATE INDEX "doctors_last_name_first_name_idx" ON "doctors"("last_name", "first_name");
CREATE INDEX "doctors_is_active_idx" ON "doctors"("is_active");

ALTER TABLE "clinics" ADD CONSTRAINT "clinics_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
