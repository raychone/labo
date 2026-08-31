import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE TEMP TABLE legacy_work_ids ON COMMIT DROP AS SELECT id FROM work_orders WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`CREATE TEMP TABLE legacy_cycle_ids ON COMMIT DROP AS SELECT id FROM work_cycles WHERE work_order_id IN (SELECT id FROM legacy_work_ids)`);
    await tx.$executeRawUnsafe(`CREATE TEMP TABLE legacy_probe_ids ON COMMIT DROP AS SELECT id FROM probe_cycles WHERE work_order_id IN (SELECT id FROM legacy_work_ids)`);
    await tx.$executeRawUnsafe(`CREATE TEMP TABLE legacy_workflow_ids ON COMMIT DROP AS SELECT id FROM work_workflow_executions WHERE work_order_id IN (SELECT id FROM legacy_work_ids)`);
    await tx.$executeRawUnsafe(`CREATE TEMP TABLE legacy_item_ids ON COMMIT DROP AS SELECT id FROM work_order_items WHERE work_order_id IN (SELECT id FROM legacy_work_ids)`);

    await tx.$executeRawUnsafe(`DELETE FROM work_stage_events WHERE workflow_execution_id IN (SELECT id FROM legacy_workflow_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM work_stage_executions WHERE workflow_execution_id IN (SELECT id FROM legacy_workflow_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM billing_document_lines WHERE work_order_id IN (SELECT id FROM legacy_work_ids) OR work_cycle_id IN (SELECT id FROM legacy_cycle_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM courier_route_stops WHERE work_order_id IN (SELECT id FROM legacy_work_ids) OR pickup_request_id IN (SELECT id FROM pickup_requests WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM delivery_preparation_items WHERE work_order_id IN (SELECT id FROM legacy_work_ids) OR work_cycle_id IN (SELECT id FROM legacy_cycle_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM work_workflow_executions WHERE id IN (SELECT id FROM legacy_workflow_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE id IN (SELECT id FROM legacy_work_ids)`);

    await tx.$executeRawUnsafe(`DELETE FROM delivery_proofs WHERE delivery_id IN (SELECT id FROM deliveries WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM delivery_events WHERE delivery_id IN (SELECT id FROM deliveries WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM deliveries WHERE id LIKE 'demo_%' OR preparation_group_id IN (SELECT id FROM delivery_preparation_groups WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM delivery_preparation_items WHERE group_id IN (SELECT id FROM delivery_preparation_groups WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM delivery_preparation_groups WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`DELETE FROM pickup_requests WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`DELETE FROM courier_route_events WHERE route_id IN (SELECT id FROM courier_routes WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM courier_route_stops WHERE route_id IN (SELECT id FROM courier_routes WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM courier_routes WHERE id LIKE 'demo_%'`);

    await tx.$executeRawUnsafe(`UPDATE billing_documents SET storno_of_document_id = NULL WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`DELETE FROM payments WHERE billing_document_id IN (SELECT id FROM billing_documents WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM billing_document_lines WHERE billing_document_id IN (SELECT id FROM billing_documents WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM billing_documents WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`DELETE FROM pricing_agreement_rules WHERE pricing_agreement_id IN (SELECT id FROM pricing_agreements WHERE id LIKE 'demo_%')`);
    await tx.$executeRawUnsafe(`DELETE FROM pricing_agreements WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`DELETE FROM patients WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`DELETE FROM doctors WHERE id LIKE 'demo_%'`);
    await tx.$executeRawUnsafe(`DELETE FROM clinics WHERE id LIKE 'demo_%'`);

    const counts = await tx.$queryRawUnsafe<Array<{ table_name: string; rows: bigint }>>(`
      SELECT 'work_orders' AS table_name, count(*) AS rows FROM work_orders WHERE id LIKE 'demo_%'
      UNION ALL SELECT 'clinics', count(*) FROM clinics WHERE id LIKE 'demo_%'
      UNION ALL SELECT 'doctors', count(*) FROM doctors WHERE id LIKE 'demo_%'
      UNION ALL SELECT 'patients', count(*) FROM patients WHERE id LIKE 'demo_%'
    `);

    return counts;
  });

  console.log("Legacy demo data cleanup complete:", result.map((row) => `${row.table_name}=${row.rows}`).join(", "));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
