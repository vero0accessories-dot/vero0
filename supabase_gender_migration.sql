-- =============================================================================
-- VERO LUXURY E-COMMERCE: PRODUCTS GENDER COLUMN MIGRATION & BACKFILL
-- Safe, Non-Destructive, and Idempotent
-- =============================================================================

-- 1. Add gender column if it does not exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.products ADD COLUMN gender TEXT;
  END IF;

  -- 2. Add CHECK constraint allowing only 'Men', 'Women', 'Unisex', or NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND constraint_name = 'chk_products_gender'
  ) THEN
    ALTER TABLE public.products 
      ADD CONSTRAINT chk_products_gender 
      CHECK (gender IS NULL OR gender IN ('Men', 'Women', 'Unisex'));
  END IF;
END $$;

-- 3. Create index for fast database-level gender filtering
CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender);

-- 4. Safe backfill from existing specifications
-- Only populates explicit and reliable gender metadata, leaves unknown products NULL
UPDATE public.products
SET gender = 'Men'
WHERE gender IS NULL AND (
  specifications::text ILIKE '%gender:Men%'
);

UPDATE public.products
SET gender = 'Women'
WHERE gender IS NULL AND (
  specifications::text ILIKE '%gender:Women%'
);

UPDATE public.products
SET gender = 'Unisex'
WHERE gender IS NULL AND (
  specifications::text ILIKE '%gender:Unisex%'
);
