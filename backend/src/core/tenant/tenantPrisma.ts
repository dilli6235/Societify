import { prisma } from '@/config/database';

/**
 * Models WITHOUT a `societyId` column. We must NOT inject a societyId filter
 * into their queries (Prisma would throw "unknown arg"). They are either
 * global catalog/tenant-root tables or are protected transitively via a
 * parent (e.g. UserRole/RefreshToken through User, enforced by RLS).
 */
const NON_TENANT_MODELS = new Set<string>([
  'Plan',
  'Society',
  'UserRole',
  'RefreshToken',
]);

/**
 * Operations that accept a top-level `where` we can safely narrow by tenant.
 *
 * NOTE: `findUnique`/`findUniqueOrThrow`/`delete`/`update` are deliberately
 * excluded — their `where` only accepts a unique selector, so injecting a
 * non-unique `societyId` would throw "Unknown argument". RLS still protects
 * these (a row from another tenant is invisible → null / P2025), which is the
 * isolation guarantee anyway.
 */
const WHERE_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'updateMany',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * Build a Prisma client bound to a single society.
 *
 * Two layers of protection, both active on every call:
 *
 *  1. RLS — each operation runs inside a transaction that first sets the
 *     transaction-local `app.current_society_id`, so PostgreSQL's row-level
 *     policies physically restrict the rows touched. This is the guarantee.
 *
 *  2. App-layer filtering — `societyId` is auto-injected into `where`/`data`
 *     so the ORM never even asks for cross-tenant rows. This is convenience
 *     and defense-in-depth (and is what makes RLS WITH CHECK pass on writes).
 *
 * `societyId` here comes only from the authenticated session — never the body.
 */
export function tenantPrisma(societyId: string) {
  return prisma.$extends({
    name: 'tenant',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scoped = !NON_TENANT_MODELS.has(model);

          if (scoped) {
            const a = args as Record<string, unknown>;

            // Inject tenant into reads/updates/deletes via top-level where.
            if (WHERE_OPS.has(operation)) {
              a.where = { ...(a.where as object | undefined), societyId };
            }

            // Single-row create: stamp the tenant onto the new row.
            if (operation === 'create') {
              a.data = { ...(a.data as object), societyId };
            }

            // upsert.where is a UNIQUE selector (can't take societyId); only the
            // create branch needs stamping. RLS guards which row upsert matches.
            if (operation === 'upsert') {
              a.create = { ...(a.create as object), societyId };
            }

            // Bulk create: stamp every row.
            if (operation === 'createMany') {
              const data = (a.data as Record<string, unknown>[]) ?? [];
              a.data = data.map((row) => ({ ...row, societyId }));
            }

            // update/delete target a unique row; their `where` can't take a
            // non-unique societyId. RLS prevents touching another tenant's row.
          }

          // Run inside a transaction so the SET applies to the same connection
          // as the query (set_config(..., true) == transaction-local).
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.current_society_id', ${societyId}, true)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof tenantPrisma>;
