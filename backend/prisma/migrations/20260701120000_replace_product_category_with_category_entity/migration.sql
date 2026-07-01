-- Replace the free-text `Product.category` string with a first-class `Category` entity.
--
-- This migration is DATA-PRESERVING: every existing product keeps its category. The
-- statements are ordered deliberately (Prisma's default drop/add would fail the NOT NULL
-- on the 24 existing rows and lose the category values):
--   1. Create the Category table + its unique/lookup indexes.
--   2. Add Product.categoryId as NULLABLE (so existing rows survive the add).
--   3. Backfill: one Category row per distinct existing product category string.
--   4. Point every product at its matching category.
--   5. Enforce NOT NULL, swap the composite index, drop the old string column, add the FK.
--
-- OrderItem.productCategory (the string snapshot) is intentionally left untouched so
-- historical orders remain correct even if a category is later renamed or removed.

-- gen_random_uuid() is built-in on PostgreSQL 13+ (target is PG16). pgcrypto guards older DBs.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) CreateTable: Category ------------------------------------------------------------
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- 2) Add Product.categoryId as NULLABLE (temporarily) so the 24 existing rows survive ---
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- 3) Backfill one Category per distinct existing product category string. The slug is
--    lowercased, non-alphanumerics collapsed to single hyphens, and edge hyphens trimmed
--    (mirrors the app-level slugify). updatedAt has no DB default, so it is set explicitly.
INSERT INTO "Category" ("id", "name", "slug", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       p.category,
       trim(both '-' from regexp_replace(lower(p.category), '[^a-z0-9]+', '-', 'g')),
       true,
       0,
       now(),
       now()
FROM (SELECT DISTINCT category FROM "Product") p;

-- 4) Point each product at its (name-matched) category ---------------------------------
UPDATE "Product" p
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."name" = p."category";

-- 5) Enforce integrity, swap indexes, drop the old column, add the FK ------------------
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

DROP INDEX "Product_isActive_category_idx";
ALTER TABLE "Product" DROP COLUMN "category";
CREATE INDEX "Product_isActive_categoryId_idx" ON "Product"("isActive", "categoryId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
