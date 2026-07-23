CREATE TYPE "BillingDocumentType" AS ENUM ('PROFORMA', 'INVOICE');
CREATE TYPE "BillingDocumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');

CREATE TABLE "billing_documents" (
  "id" TEXT NOT NULL,
  "type" "BillingDocumentType" NOT NULL,
  "status" "BillingDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "series" VARCHAR(24),
  "number" INTEGER,
  "formatted_number" VARCHAR(40),
  "issue_date" TIMESTAMP(3) NOT NULL,
  "due_date" TIMESTAMP(3),
  "clinic_id" TEXT NOT NULL,
  "doctor_id" TEXT,
  "clinic_name_snapshot" VARCHAR(160) NOT NULL,
  "clinic_legal_name_snapshot" VARCHAR(160),
  "clinic_tax_id_snapshot" VARCHAR(80),
  "clinic_registration_number_snapshot" VARCHAR(80),
  "clinic_address_snapshot" VARCHAR(500),
  "clinic_email_snapshot" VARCHAR(254),
  "clinic_phone_snapshot" VARCHAR(40),
  "currency" CHAR(3) NOT NULL,
  "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
  "discount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_minor" INTEGER NOT NULL DEFAULT 0,
  "total_minor" INTEGER NOT NULL DEFAULT 0,
  "notes" VARCHAR(2000),
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,
  "issued_at" TIMESTAMP(3),
  "issued_by_user_id" TEXT,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "billing_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_documents_number_positive_check" CHECK ("number" IS NULL OR "number" >= 1),
  CONSTRAINT "billing_documents_subtotal_minor_check" CHECK ("subtotal_minor" >= 0),
  CONSTRAINT "billing_documents_discount_minor_check" CHECK ("discount_minor" >= 0),
  CONSTRAINT "billing_documents_tax_minor_check" CHECK ("tax_minor" >= 0),
  CONSTRAINT "billing_documents_total_minor_check" CHECK ("total_minor" >= 0)
);

CREATE TABLE "billing_document_lines" (
  "id" TEXT NOT NULL,
  "billing_document_id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "work_code" VARCHAR(24) NOT NULL,
  "patient_name_snapshot" VARCHAR(120) NOT NULL,
  "doctor_name_snapshot" VARCHAR(180) NOT NULL,
  "work_type_name_snapshot" VARCHAR(160) NOT NULL,
  "tooth_position_snapshot" VARCHAR(120),
  "quantity" INTEGER NOT NULL,
  "unit_price_minor" INTEGER NOT NULL,
  "line_total_minor" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_document_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_document_lines_quantity_check" CHECK ("quantity" >= 1),
  CONSTRAINT "billing_document_lines_unit_price_minor_check" CHECK ("unit_price_minor" >= 0),
  CONSTRAINT "billing_document_lines_line_total_minor_check" CHECK ("line_total_minor" >= 0)
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "billing_document_id" TEXT NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "payment_date" TIMESTAMP(3) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "receipt_number" VARCHAR(80),
  "receipt_date" TIMESTAMP(3),
  "reference" VARCHAR(160),
  "notes" VARCHAR(1000),
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_amount_minor_check" CHECK ("amount_minor" > 0)
);

CREATE TABLE "billing_series" (
  "id" TEXT NOT NULL,
  "document_type" "BillingDocumentType" NOT NULL,
  "prefix" VARCHAR(16) NOT NULL,
  "current_number" INTEGER NOT NULL DEFAULT 0,
  "year" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "billing_series_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_series_current_number_check" CHECK ("current_number" >= 0),
  CONSTRAINT "billing_series_year_check" CHECK ("year" >= 2000 AND "year" <= 2100)
);

ALTER TABLE "work_orders" ADD COLUMN "invoiced_document_id" TEXT;

CREATE UNIQUE INDEX "billing_documents_type_series_number_key" ON "billing_documents"("type", "series", "number");
CREATE INDEX "billing_documents_clinic_id_idx" ON "billing_documents"("clinic_id");
CREATE INDEX "billing_documents_doctor_id_idx" ON "billing_documents"("doctor_id");
CREATE INDEX "billing_documents_type_idx" ON "billing_documents"("type");
CREATE INDEX "billing_documents_status_idx" ON "billing_documents"("status");
CREATE INDEX "billing_documents_issue_date_idx" ON "billing_documents"("issue_date");
CREATE INDEX "billing_documents_formatted_number_idx" ON "billing_documents"("formatted_number");
CREATE INDEX "billing_documents_created_at_idx" ON "billing_documents"("created_at");
CREATE INDEX "billing_documents_cancelled_at_idx" ON "billing_documents"("cancelled_at");
CREATE INDEX "billing_documents_created_by_user_id_idx" ON "billing_documents"("created_by_user_id");
CREATE INDEX "billing_documents_updated_by_user_id_idx" ON "billing_documents"("updated_by_user_id");
CREATE INDEX "billing_documents_issued_by_user_id_idx" ON "billing_documents"("issued_by_user_id");
CREATE INDEX "billing_documents_cancelled_by_user_id_idx" ON "billing_documents"("cancelled_by_user_id");

CREATE UNIQUE INDEX "billing_document_lines_billing_document_id_work_order_id_key" ON "billing_document_lines"("billing_document_id", "work_order_id");
CREATE INDEX "billing_document_lines_billing_document_id_sort_order_idx" ON "billing_document_lines"("billing_document_id", "sort_order");
CREATE INDEX "billing_document_lines_work_order_id_idx" ON "billing_document_lines"("work_order_id");
CREATE INDEX "billing_document_lines_work_code_idx" ON "billing_document_lines"("work_code");

CREATE INDEX "payments_clinic_id_idx" ON "payments"("clinic_id");
CREATE INDEX "payments_billing_document_id_idx" ON "payments"("billing_document_id");
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");
CREATE INDEX "payments_method_idx" ON "payments"("method");
CREATE INDEX "payments_receipt_number_idx" ON "payments"("receipt_number");
CREATE INDEX "payments_cancelled_at_idx" ON "payments"("cancelled_at");
CREATE INDEX "payments_created_by_user_id_idx" ON "payments"("created_by_user_id");
CREATE INDEX "payments_cancelled_by_user_id_idx" ON "payments"("cancelled_by_user_id");

CREATE UNIQUE INDEX "billing_series_document_type_prefix_year_key" ON "billing_series"("document_type", "prefix", "year");
CREATE INDEX "billing_series_document_type_is_active_idx" ON "billing_series"("document_type", "is_active");
CREATE INDEX "billing_series_year_idx" ON "billing_series"("year");

CREATE INDEX "work_orders_invoiced_document_id_idx" ON "work_orders"("invoiced_document_id");

ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_document_lines" ADD CONSTRAINT "billing_document_lines_billing_document_id_fkey" FOREIGN KEY ("billing_document_id") REFERENCES "billing_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_document_lines" ADD CONSTRAINT "billing_document_lines_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_document_id_fkey" FOREIGN KEY ("billing_document_id") REFERENCES "billing_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_invoiced_document_id_fkey" FOREIGN KEY ("invoiced_document_id") REFERENCES "billing_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
