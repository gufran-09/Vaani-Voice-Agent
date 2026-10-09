-- Seed Indian Cafe Menu Items for all properties
DO $$
DECLARE
    prop RECORD;
    v_cat_bev uuid;
    v_cat_snack uuid;
    v_cat_bakery uuid;
BEGIN
    FOR prop IN SELECT id FROM properties LOOP
        -- Delete existing if any to avoid duplicates
        DELETE FROM menu_items WHERE property_id = prop.id;
        DELETE FROM menu_categories WHERE property_id = prop.id;

        -- 1. Categories
        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Beverages', 1) RETURNING id INTO v_cat_bev;

        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Hot Snacks', 2) RETURNING id INTO v_cat_snack;

        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Bakery & Breakfast', 3) RETURNING id INTO v_cat_bakery;

        -- 2. Items with Spoken Aliases (Critical for Speech Recognition Matching)
        INSERT INTO menu_items (property_id, category_id, name, price, prep_time_minutes, availability, spoken_aliases) VALUES
        (prop.id, v_cat_bev, 'South Indian Filter Coffee', 40.00, 3, 'available', ARRAY['filter coffee', 'kaapi', 'coffee', 'degree coffee', 'hot coffee']),
        (prop.id, v_cat_bev, 'Masala Chai', 30.00, 3, 'available', ARRAY['masala chai', 'chai', 'tea', 'garam chai', 'adrak chai', 'cutting chai']),
        (prop.id, v_cat_bev, 'Cold Coffee', 70.00, 4, 'available', ARRAY['cold coffee', 'iced coffee', 'frappe']),
        
        (prop.id, v_cat_snack, 'Samosa (2 pcs)', 50.00, 6, 'available', ARRAY['samosa', 'samose', 'samosas', 'singara', 'aloo samosa']),
        (prop.id, v_cat_snack, 'Veg Puff', 45.00, 4, 'available', ARRAY['veg puff', 'puff', 'curry puff', 'patties', 'veg patty']),
        (prop.id, v_cat_snack, 'Paneer Roll', 80.00, 8, 'available', ARRAY['paneer roll', 'paneer wrap', 'frankie']),
        (prop.id, v_cat_snack, 'Bun Maska', 50.00, 3, 'available', ARRAY['bun maska', 'maska bun', 'butter bun']),
        (prop.id, v_cat_snack, 'Medu Vada (2 pcs)', 60.00, 5, 'available', ARRAY['vada', 'medu vada', 'wada', 'garelu']),

        (prop.id, v_cat_bakery, 'Butter Croissant', 90.00, 4, 'available', ARRAY['croissant', 'butter croissant']),
        (prop.id, v_cat_bakery, 'Chocolate Muffin', 65.00, 3, 'available', ARRAY['muffin', 'chocolate muffin', 'cupcake']);
    END LOOP;
END $$;
