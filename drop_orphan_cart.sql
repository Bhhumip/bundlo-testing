DROP TABLE IF EXISTS "Cart";
DROP TABLE IF EXISTS "SseToken";
DELETE FROM "_prisma_migrations" WHERE migration_name IN ('20260611171817_add_persistent_cart','20260611171843_npx_prisma_generate');
