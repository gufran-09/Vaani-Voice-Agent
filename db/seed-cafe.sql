-- Seed Comprehensive Indian Cafe Menu Items for all properties
DO $$
DECLARE
    prop RECORD;
    v_cat_hot_bev uuid;
    v_cat_cold_bev uuid;
    v_cat_snack uuid;
    v_cat_tiffin uuid;
    v_cat_bakery uuid;
    v_cat_main uuid;
BEGIN
    FOR prop IN SELECT id FROM properties LOOP
        -- Delete existing if any to avoid duplicates
        DELETE FROM menu_items WHERE property_id = prop.id;
        DELETE FROM menu_categories WHERE property_id = prop.id;

        -- 1. Categories
        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Hot Beverages', 1) RETURNING id INTO v_cat_hot_bev;

        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Cold Beverages', 2) RETURNING id INTO v_cat_cold_bev;

        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Hot Snacks & Savories', 3) RETURNING id INTO v_cat_snack;

        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Tiffin & Breakfast', 4) RETURNING id INTO v_cat_tiffin;

        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Bakery & Desserts', 5) RETURNING id INTO v_cat_bakery;

        INSERT INTO menu_categories (property_id, name, display_order)
        VALUES (prop.id, 'Main Course', 6) RETURNING id INTO v_cat_main;

        -- 2. Items with Spoken Aliases & Descriptions
        INSERT INTO menu_items (property_id, category_id, name, description, price, prep_time_minutes, availability, spoken_aliases, allergens) VALUES
        -- Hot Beverages
        (prop.id, v_cat_hot_bev, 'South Indian Filter Coffee', 'Traditional freshly brewed chicory blend with frothy milk, served dabarah style.', 40.00, 3, 'available', ARRAY['filter coffee', 'kaapi', 'coffee', 'degree coffee', 'hot coffee', 'filter kaapi', 'south indian coffee'], ARRAY['milk']),
        (prop.id, v_cat_hot_bev, 'Cutting Masala Chai', 'Ginger, cardamom, and clove infused hot milk tea brewed to kadak perfection.', 30.00, 3, 'available', ARRAY['masala chai', 'chai', 'tea', 'garam chai', 'adrak chai', 'cutting chai', 'kadak chai'], ARRAY['milk']),
        (prop.id, v_cat_hot_bev, 'Classic Espresso', 'A single shot of rich, concentrated espresso with a velvety golden crema.', 120.00, 3, 'available', ARRAY['espresso', 'short black', 'single shot'], ARRAY[]::text[]),
        (prop.id, v_cat_hot_bev, 'Cappuccino', 'Espresso topped with equal parts velvety steamed milk and thick foam.', 180.00, 5, 'available', ARRAY['cappuccino', 'capp', 'frothy coffee'], ARRAY['milk']),
        (prop.id, v_cat_hot_bev, 'Masala Chai Latte', 'Spiced Indian tea reduction frothed with micro-textured steamed milk.', 150.00, 5, 'available', ARRAY['chai latte', 'spiced tea latte'], ARRAY['milk']),
        (prop.id, v_cat_hot_bev, 'Hot Chocolate', 'Creamy Belgian chocolate melted with steamed milk, topped with whipped cream.', 200.00, 5, 'available', ARRAY['hot choco', 'chocolate drink', 'cocoa'], ARRAY['milk']),

        -- Cold Beverages
        (prop.id, v_cat_cold_bev, 'Cold Brew Coffee', '18-hour cold-steeped single-origin coffee, smooth and low in acidity over ice.', 220.00, 2, 'available', ARRAY['cold brew', 'iced coffee'], ARRAY[]::text[]),
        (prop.id, v_cat_cold_bev, 'Classic Cold Coffee', 'Creamy blended chilled milk coffee with vanilla bean and rich espresso froth.', 70.00, 4, 'available', ARRAY['cold coffee', 'frappe', 'thick cold coffee'], ARRAY['milk']),
        (prop.id, v_cat_cold_bev, 'Mango Lassi', 'Fresh Alphonso mango blended with thick yogurt and a hint of green cardamom.', 160.00, 4, 'available', ARRAY['mango lassi', 'mango drink', 'lassi'], ARRAY['milk']),
        (prop.id, v_cat_cold_bev, 'Watermelon Mint Cooler', 'Fresh crushed watermelon juice with garden mint and a dash of black salt.', 140.00, 4, 'available', ARRAY['watermelon cooler', 'mint cooler', 'watermelon juice'], ARRAY[]::text[]),

        -- Hot Snacks & Savories
        (prop.id, v_cat_snack, 'Samosa (2 pcs)', 'Crispy golden flaky pastry stuffed with spiced potatoes and green peas.', 50.00, 6, 'available', ARRAY['samosa', 'samose', 'samosas', 'singara', 'aloo samosa', 'two samosas', 'do samosa'], ARRAY['gluten']),
        (prop.id, v_cat_snack, 'Masala Vada Pav', 'Spicy potato fritter in a soft pav bun with garlic chutney and fried chili.', 80.00, 6, 'available', ARRAY['vada pav', 'vada', 'potato bun', 'mumbai vada pav'], ARRAY['gluten']),
        (prop.id, v_cat_snack, 'Spiced Veg Puff', 'Golden puff pastry layered with aromatic curried carrots, peas, and potatoes.', 45.00, 4, 'available', ARRAY['veg puff', 'puff', 'curry puff', 'patties', 'veg patty'], ARRAY['gluten']),
        (prop.id, v_cat_snack, 'Paneer Roll', 'Spiced paneer cubes with sautéed onions wrapped in a crisp paratha.', 80.00, 8, 'available', ARRAY['paneer roll', 'paneer wrap', 'frankie'], ARRAY['gluten', 'milk']),
        (prop.id, v_cat_snack, 'Paneer Tikka Wrap', 'Char-grilled tandoori paneer and bell peppers in whole-wheat wrap with mint chutney.', 260.00, 12, 'available', ARRAY['paneer wrap', 'tikka wrap', 'cottage cheese wrap'], ARRAY['gluten', 'milk']),
        (prop.id, v_cat_snack, 'Medu Vada (2 pcs)', 'Crispy fried lentil doughnuts with crunchy exterior, served with coconut chutney.', 60.00, 5, 'available', ARRAY['vada', 'medu vada', 'wada', 'garelu', 'two vadas'], ARRAY[]::text[]),
        (prop.id, v_cat_snack, 'Cheese Garlic Bread', 'Toasted ciabatta slices brushed with garlic herb butter and melted mozzarella.', 130.00, 8, 'available', ARRAY['garlic bread', 'cheese bread', 'cheesy garlic'], ARRAY['gluten', 'milk']),
        (prop.id, v_cat_snack, 'Crispy Corn Chaat', 'Flash-fried sweet corn tossed with diced red onion, lime, and chaat spices.', 160.00, 8, 'available', ARRAY['corn chaat', 'crispy corn', 'fried corn'], ARRAY[]::text[]),

        -- Tiffin & Breakfast
        (prop.id, v_cat_tiffin, 'Irani Bun Maska', 'Warm soft bakery bun sliced and stuffed with rich sweet cream butter slab.', 50.00, 3, 'available', ARRAY['bun maska', 'maska bun', 'butter bun'], ARRAY['gluten', 'milk']),
        (prop.id, v_cat_tiffin, 'Tawa Masala Dosa', 'Crispy golden fermented rice crepe filled with spiced tempered potato mash.', 90.00, 8, 'available', ARRAY['dosa', 'masala dosa', 'dosalu', 'masale dosa'], ARRAY[]::text[]),
        (prop.id, v_cat_tiffin, 'Avocado Toast', 'Toasted artisanal sourdough topped with crushed avocado, cherry tomatoes, and feta.', 280.00, 8, 'available', ARRAY['avocado toast', 'avo toast', 'avocado bread'], ARRAY['gluten', 'milk']),

        -- Bakery & Desserts
        (prop.id, v_cat_bakery, 'Butter Croissant', 'Flaky, buttery French laminated pastry baked fresh and served golden crisp.', 90.00, 4, 'available', ARRAY['croissant', 'butter croissant'], ARRAY['gluten', 'milk']),
        (prop.id, v_cat_bakery, 'Chocolate Muffin', 'Double chocolate chip sponge muffin with rich cocoa core and ganache drops.', 65.00, 3, 'available', ARRAY['muffin', 'chocolate muffin', 'cupcake'], ARRAY['gluten', 'milk']),
        (prop.id, v_cat_bakery, 'Warm Chocolate Brownie', 'Fudgy dark chocolate walnut brownie served warm with vanilla cream.', 180.00, 6, 'available', ARRAY['brownie', 'choco brownie', 'chocolate cake'], ARRAY['gluten', 'milk']),
        (prop.id, v_cat_bakery, 'Gulab Jamun (2 pcs)', 'Soft melt-in-mouth milk dumplings soaked in saffron rose aromatic syrup.', 120.00, 3, 'available', ARRAY['gulab jamun', 'jamun', 'sweet dumplings', 'two gulab jamun'], ARRAY['milk', 'gluten']),
        (prop.id, v_cat_bakery, 'Mango Panna Cotta', 'Silky vanilla set cream infused with cardamom and Alphonso mango glaze.', 160.00, 3, 'available', ARRAY['panna cotta', 'mango dessert', 'Italian dessert'], ARRAY['milk']),

        -- Main Course
        (prop.id, v_cat_main, 'Dal Makhani Bowl', 'Overnight slow-cooked black lentils in rich butter-tomato gravy with jeera rice.', 250.00, 12, 'available', ARRAY['dal makhani', 'dal bowl', 'lentil bowl', 'black dal'], ARRAY['milk']),
        (prop.id, v_cat_main, 'Creamy Mushroom Pasta', 'Penne tossed with button and cremini mushrooms in garlic Parmesan cream sauce.', 320.00, 15, 'available', ARRAY['mushroom pasta', 'pasta', 'creamy pasta'], ARRAY['gluten', 'milk']);
    END LOOP;
END $$;
