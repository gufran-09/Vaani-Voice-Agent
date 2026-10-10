/**
 * Seed script: Vaani Café – Comprehensive Menu Data for ALL Properties
 * Run: npx tsx scripts/seed-menu.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Safely load .env or .env.local
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
const envPath = fs.existsSync(envLocalPath) ? envLocalPath : path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Complete Menu Definition ─────────────────────────────────────────────────

export interface SeedMenuItem {
  name: string;
  description: string;
  price: number;
  spoken_aliases: string[];
  allergens: string[];
  prep_time_minutes: number;
  availability?: string;
}

export const CATEGORIES = [
  { name: 'Hot Beverages', display_order: 1 },
  { name: 'Cold Beverages', display_order: 2 },
  { name: 'Hot Snacks & Savories', display_order: 3 },
  { name: 'Tiffin & Breakfast', display_order: 4 },
  { name: 'Bakery & Desserts', display_order: 5 },
  { name: 'Main Course', display_order: 6 },
];

export const ALL_MENU_ITEMS: Record<string, SeedMenuItem[]> = {
  'Hot Beverages': [
    {
      name: 'South Indian Filter Coffee',
      description: 'Traditional freshly brewed chicory blend with frothy milk, served dabarah style.',
      price: 40,
      spoken_aliases: ['filter coffee', 'kaapi', 'coffee', 'degree coffee', 'hot coffee', 'filter kaapi', 'south indian coffee'],
      allergens: ['milk'],
      prep_time_minutes: 3,
    },
    {
      name: 'Cutting Masala Chai',
      description: 'Ginger, cardamom, and clove infused hot milk tea brewed to kadak perfection.',
      price: 30,
      spoken_aliases: ['masala chai', 'chai', 'tea', 'garam chai', 'adrak chai', 'cutting chai', 'kadak chai'],
      allergens: ['milk'],
      prep_time_minutes: 3,
    },
    {
      name: 'Classic Espresso',
      description: 'A single shot of rich, concentrated espresso with a velvety golden crema.',
      price: 120,
      spoken_aliases: ['espresso', 'short black', 'single shot'],
      allergens: [],
      prep_time_minutes: 3,
    },
    {
      name: 'Cappuccino',
      description: 'Espresso topped with equal parts velvety steamed milk and thick foam.',
      price: 180,
      spoken_aliases: ['cappuccino', 'capp', 'frothy coffee'],
      allergens: ['milk'],
      prep_time_minutes: 5,
    },
    {
      name: 'Masala Chai Latte',
      description: 'Spiced Indian tea reduction frothed with micro-textured steamed milk.',
      price: 150,
      spoken_aliases: ['chai latte', 'spiced tea latte'],
      allergens: ['milk'],
      prep_time_minutes: 5,
    },
    {
      name: 'Hot Chocolate',
      description: 'Creamy Belgian chocolate melted with steamed milk, topped with whipped cream.',
      price: 200,
      spoken_aliases: ['hot choco', 'chocolate drink', 'cocoa'],
      allergens: ['milk'],
      prep_time_minutes: 5,
    },
  ],
  'Cold Beverages': [
    {
      name: 'Cold Brew Coffee',
      description: '18-hour cold-steeped single-origin coffee, smooth and low in acidity over ice.',
      price: 220,
      spoken_aliases: ['cold brew', 'iced coffee'],
      allergens: [],
      prep_time_minutes: 2,
    },
    {
      name: 'Classic Cold Coffee',
      description: 'Creamy blended chilled milk coffee with vanilla bean and rich espresso froth.',
      price: 70,
      spoken_aliases: ['cold coffee', 'frappe', 'thick cold coffee'],
      allergens: ['milk'],
      prep_time_minutes: 4,
    },
    {
      name: 'Mango Lassi',
      description: 'Fresh Alphonso mango blended with thick yogurt and a hint of green cardamom.',
      price: 160,
      spoken_aliases: ['mango lassi', 'mango drink', 'lassi'],
      allergens: ['milk'],
      prep_time_minutes: 4,
    },
    {
      name: 'Watermelon Mint Cooler',
      description: 'Fresh crushed watermelon juice with garden mint and a dash of black salt.',
      price: 140,
      spoken_aliases: ['watermelon cooler', 'mint cooler', 'watermelon juice'],
      allergens: [],
      prep_time_minutes: 4,
    },
  ],
  'Hot Snacks & Savories': [
    {
      name: 'Samosa (2 pcs)',
      description: 'Crispy golden flaky pastry stuffed with spiced potatoes and green peas.',
      price: 50,
      spoken_aliases: ['samosa', 'samose', 'samosas', 'singara', 'aloo samosa', 'two samosas', 'do samosa'],
      allergens: ['gluten'],
      prep_time_minutes: 6,
    },
    {
      name: 'Masala Vada Pav',
      description: 'Spicy potato fritter in a soft pav bun with garlic chutney and fried chili.',
      price: 80,
      spoken_aliases: ['vada pav', 'vada', 'potato bun', 'mumbai vada pav'],
      allergens: ['gluten'],
      prep_time_minutes: 6,
    },
    {
      name: 'Spiced Veg Puff',
      description: 'Golden puff pastry layered with aromatic curried carrots, peas, and potatoes.',
      price: 45,
      spoken_aliases: ['veg puff', 'puff', 'curry puff', 'patties', 'veg patty'],
      allergens: ['gluten'],
      prep_time_minutes: 4,
    },
    {
      name: 'Paneer Roll',
      description: 'Spiced paneer cubes with sautéed onions wrapped in a crisp paratha.',
      price: 80,
      spoken_aliases: ['paneer roll', 'paneer wrap', 'frankie'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 8,
    },
    {
      name: 'Paneer Tikka Wrap',
      description: 'Char-grilled tandoori paneer and bell peppers in whole-wheat wrap with mint chutney.',
      price: 260,
      spoken_aliases: ['paneer wrap', 'tikka wrap', 'cottage cheese wrap'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 12,
    },
    {
      name: 'Medu Vada (2 pcs)',
      description: 'Crispy fried lentil doughnuts with crunchy exterior, served with coconut chutney.',
      price: 60,
      spoken_aliases: ['vada', 'medu vada', 'wada', 'garelu', 'two vadas'],
      allergens: [],
      prep_time_minutes: 5,
    },
    {
      name: 'Cheese Garlic Bread',
      description: 'Toasted ciabatta slices brushed with garlic herb butter and melted mozzarella.',
      price: 130,
      spoken_aliases: ['garlic bread', 'cheese bread', 'cheesy garlic'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 8,
    },
    {
      name: 'Crispy Corn Chaat',
      description: 'Flash-fried sweet corn tossed with diced red onion, lime, and chaat spices.',
      price: 160,
      spoken_aliases: ['corn chaat', 'crispy corn', 'fried corn'],
      allergens: [],
      prep_time_minutes: 8,
    },
  ],
  'Tiffin & Breakfast': [
    {
      name: 'Irani Bun Maska',
      description: 'Warm soft bakery bun sliced and stuffed with rich sweet cream butter slab.',
      price: 50,
      spoken_aliases: ['bun maska', 'maska bun', 'butter bun'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 3,
    },
    {
      name: 'Tawa Masala Dosa',
      description: 'Crispy golden fermented rice crepe filled with spiced tempered potato mash.',
      price: 90,
      spoken_aliases: ['dosa', 'masala dosa', 'dosalu', 'masale dosa'],
      allergens: [],
      prep_time_minutes: 8,
    },
    {
      name: 'Avocado Toast',
      description: 'Toasted artisanal sourdough topped with crushed avocado, cherry tomatoes, and feta.',
      price: 280,
      spoken_aliases: ['avocado toast', 'avo toast', 'avocado bread'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 8,
    },
  ],
  'Bakery & Desserts': [
    {
      name: 'Butter Croissant',
      description: 'Flaky, buttery French laminated pastry baked fresh and served golden crisp.',
      price: 90,
      spoken_aliases: ['croissant', 'butter croissant'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 4,
    },
    {
      name: 'Chocolate Muffin',
      description: 'Double chocolate chip sponge muffin with rich cocoa core and ganache drops.',
      price: 65,
      spoken_aliases: ['muffin', 'chocolate muffin', 'cupcake'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 3,
    },
    {
      name: 'Warm Chocolate Brownie',
      description: 'Fudgy dark chocolate walnut brownie served warm with vanilla cream.',
      price: 180,
      spoken_aliases: ['brownie', 'choco brownie', 'chocolate cake'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 6,
    },
    {
      name: 'Gulab Jamun (2 pcs)',
      description: 'Soft melt-in-mouth milk dumplings soaked in saffron rose aromatic syrup.',
      price: 120,
      spoken_aliases: ['gulab jamun', 'jamun', 'sweet dumplings', 'two gulab jamun'],
      allergens: ['milk', 'gluten'],
      prep_time_minutes: 3,
    },
    {
      name: 'Mango Panna Cotta',
      description: 'Silky vanilla set cream infused with cardamom and Alphonso mango glaze.',
      price: 160,
      spoken_aliases: ['panna cotta', 'mango dessert', 'Italian dessert'],
      allergens: ['milk'],
      prep_time_minutes: 3,
    },
  ],
  'Main Course': [
    {
      name: 'Dal Makhani Bowl',
      description: 'Overnight slow-cooked black lentils in rich butter-tomato gravy with jeera rice.',
      price: 250,
      spoken_aliases: ['dal makhani', 'dal bowl', 'lentil bowl', 'black dal'],
      allergens: ['milk'],
      prep_time_minutes: 12,
    },
    {
      name: 'Creamy Mushroom Pasta',
      description: 'Penne tossed with button and cremini mushrooms in garlic Parmesan cream sauce.',
      price: 320,
      spoken_aliases: ['mushroom pasta', 'pasta', 'creamy pasta'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 15,
    },
  ],
};

// ─── Main Seed Function ───────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all properties
    const propsRes = await client.query<{ id: string; name: string }>(
      'SELECT id, name FROM properties ORDER BY name ASC'
    );
    const properties = propsRes.rows;
    console.log(`Found ${properties.length} properties in database.`);

    for (const prop of properties) {
      console.log(`\n🌱 Seeding full menu for property "${prop.name}" (${prop.id})...`);

      // 1. Clear old menu data for this property
      await client.query('DELETE FROM menu_items WHERE property_id = $1', [prop.id]);
      await client.query('DELETE FROM menu_categories WHERE property_id = $1', [prop.id]);

      let propItemsCount = 0;

      // 2. Insert all categories and items
      for (const cat of CATEGORIES) {
        const catRes = await client.query<{ id: string }>(
          `INSERT INTO menu_categories (property_id, name, display_order)
           VALUES ($1, $2, $3) RETURNING id`,
          [prop.id, cat.name, cat.display_order]
        );
        const categoryId = catRes.rows[0].id;

        const items = ALL_MENU_ITEMS[cat.name] || [];
        for (const item of items) {
          await client.query(
            `INSERT INTO menu_items
               (category_id, property_id, name, description, price, spoken_aliases, allergens, prep_time_minutes, availability)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              categoryId,
              prop.id,
              item.name,
              item.description,
              item.price,
              item.spoken_aliases,
              item.allergens,
              item.prep_time_minutes,
              item.availability ?? 'available',
            ]
          );
          propItemsCount++;
        }
      }
      console.log(`   ✅ Seeded ${propItemsCount} menu items across ${CATEGORIES.length} categories for "${prop.name}".`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 ALL properties successfully updated with the complete food catalog!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed – rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
