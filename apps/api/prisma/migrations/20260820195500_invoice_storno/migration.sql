ALTER TABLE "billing_documents"
ADD COLUMN "storno_of_document_id" TEXT;

CREATE UNIQUE INDEX "billing_documents_storno_of_document_id_key"
ON "billing_documents"("storno_of_document_id");

ALTER TABLE "billing_documents"
ADD CONSTRAINT "billing_documents_storno_of_document_id_fkey"
FOREIGN KEY ("storno_of_document_id") REFERENCES "billing_documents"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
