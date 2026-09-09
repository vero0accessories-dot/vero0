-- =============================================================================
-- VERO LUXURY PRODUCTION SEED DATA (POSTGRESQL SELF-HOSTED)
-- Safe, idempotent execution. Never deletes existing records.
-- =============================================================================

-- 1. Default Categories
INSERT INTO public.categories (id, name, name_ar, name_en, slug, image, description)
VALUES
  ('all', 'All Collections', 'جميع المجموعات', 'All Collections', 'all', '/images/sculpted-aurelian-ring.jpg', '{"target_gender":"All","genders":["Men","Women","Unisex"]}'),
  ('fine-jewelry', 'Fine Jewelry', 'المجوهرات الراقية', 'Fine Jewelry', 'fine-jewelry', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_4xPadl5w6Pl2wmap9TNWjuW3eRqmSaee8UcVUYb5Ob0tjxyVXXgSUz8bd800TgShznRuwLsCSE8fL8g54lW8D6Y2Wqn77Y3VnnDy11ZQQyS78UrFyUgxqRXe83BtXdaR7o05YC071Tjfyge5uII8vI9eb_n0zITggflZzz8_ocIceRDAsQovQqPZTN6SXT9FkEnH750_FvFUxz-___-L_RW-wCIyddPds8SWGNUvJZlb-z3tgbVqUqsnmttQOxLDZXqdfrdHuOs', '{"target_gender":"All","genders":["Men","Women","Unisex"]}'),
  ('timepieces', 'Timepieces', 'الساعات الفاخرة', 'Timepieces', 'timepieces', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHURVDMw0Ut_yNnemHeLgqN9kEmRJy9KfyIJhWGm36fQh-CMtrO0pGYuaCr4MR-OaDy0sUnfzCwvRWYY9815RVkpasZq00PZ0fRbmOmCVpkPwSWKRtiicrCUREgDhVRGMuHYa792wqM27VJFjYjxLBhHEpkVf0Ipvb3HquyCydhbrE5uPWIC5KS6E4w4d31wBTOnNQIu3ooZafSZ0qWewaHaQeiPuHaoRpnPOY5j01Hhjk48HWuTgKuMfPyIs5QbInR7O3tUJq5c8', '{"target_gender":"All","genders":["Men","Women","Unisex"]}'),
  ('necklaces', 'Necklaces', 'القلائد والسلاسل', 'Necklaces', 'necklaces', '/images/luxury-necklace-banner.jpg', '{"target_gender":"All","genders":["Men","Women","Unisex"]}'),
  ('rings', 'Rings', 'الخواتم', 'Rings', 'rings', '/images/sculpted-aurelian-ring.jpg', '{"target_gender":"All","genders":["Men","Women","Unisex"]}'),
  ('earrings', 'Earrings', 'الأقراط', 'Earrings', 'earrings', '/images/desert-moon-hoops.jpg', '{"target_gender":"Women","genders":["Women"]}'),
  ('bracelets', 'Bracelets', 'الأساور', 'Bracelets', 'bracelets', '/images/eternal-bangle.jpg', '{"target_gender":"All","genders":["Men","Women","Unisex"]}'),
  ('leather-goods', 'Leather Goods', 'المنتجات الجلدية', 'Leather Goods', 'leather-goods', '/images/essential-cardholder.jpg', '{"target_gender":"All","genders":["Men","Women","Unisex"]}'),
  ('accessories', 'Accessories', 'الإكسسوارات', 'Accessories', 'accessories', '/images/artisan-watch-roll.jpg', '{"target_gender":"All","genders":["Men","Women","Unisex"]}')
ON CONFLICT (id) DO NOTHING;

-- 2. Default Admin Accounts & Pre-existing Users
INSERT INTO public.users (id, email, name, role, tier, loyalty_points, total_spent, password_hash, salt)
VALUES
  ('d08429b0-1b60-48f7-8d97-040d058395cf', 'vero2026@vero.com', 'VERO Executive Admin', 'admin', 'Platinum', 5000, 125000.00, '3ba7364c0bc40fe282076f989bf297c21f889e17bcdc943b084bace49c4e67216f34fefef542324aa9b613f0103f7668492daaf49251df686cb587ff06d5d3ee', '2974087f5907343130d07f9ff2b395c3'),
  ('dff41e77-b168-415c-9e72-10a74eb7584b', 'admin@vero.com', 'VERO System Admin', 'admin', 'Platinum', 5000, 100000.00, '', ''),
  ('0faeb040-8ae6-4eb5-8e21-5eda8a4700da', 'customer@vero.com', 'VERO Customer', 'customer', 'Gold', 1000, 25000.00, '', ''),
  ('c8b3b828-8a10-4ab6-8a1c-0ca8c6285619', 'arthurdevelopment101@gmail.com', 'Arthur Collector', 'customer', 'Gold', 1250, 42000.00, '', '')
ON CONFLICT (email) DO UPDATE SET
  password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
  salt = CASE WHEN EXCLUDED.salt != '' THEN EXCLUDED.salt ELSE users.salt END;

-- 3. Initial Products Catalog
INSERT INTO public.products (id, name, category_id, category_name, price, stock, image, description, sku, brand, status, craftsmanship)
VALUES
  ('ring', 'ring', 'rings', 'Rings', 1310.00, 10, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAddIhaoIoctIr0SZvOxl2amgoVXs5GW4AyMZuYqzRetb-PH8shfjL6df3_PiwyH1Hq439E0Lx2BbcFBHSvkTXKFeVAyN92YRXuBaqw5zNRh1EeGjfO57TlVuURTAiBXcnB5JXznCQbwsDIBHNH4A67hRHjmOnUwZMTbvAfO3y2yBNdTetjXHWJtoZ6VB_1S7MgOifVHC4W8P2FoG_bM4ak1sMXvZPk3gc-CSGh5MJoRqjQIgpDVA9Ml4wexbNyxsv5WZItb_S1I58', 'An authentic quiet luxury piece hand-finished with exceptional Italian craftsmanship.', 'VERO-RNG-421', 'VERO', 'active', 'Made with traditional Italian jewelry techniques'),
  ('we', 'we', 'accessories', 'Accessories', 700.00, 10, 'https://lh3.googleusercontent.com/aida-public/AB6AXuA55XK6inPikYx_KnduhFvjR4J4r-Fz_0_MZeirVYlQnJcPeo3B3yJbFLZxM2oUqj2K4hOYY0VewYoDXWp5MzATq0mNes3bavvaIuwaKC-v7bFmUPeG5D1UbHy40cYoAniwy7x5OMf602l7xaIr3pzsyO28iOD8e4hdSxVOIQPeN0U8dossai-1QVPhtz7XRb9b0NxL8vjc5GglkDdH37aQtDOcZHbyQ7h9Ad-kMAtUcJAOHqIhAi6YLgg8Dcgt8eQGSeia3zX9Wl0', 'An authentic quiet luxury piece hand-finished with exceptional Italian craftsmanship.', 'VERO-ACC-902', 'VERO', 'active', 'Handcrafted by Italian artisans')
ON CONFLICT (id) DO NOTHING;
