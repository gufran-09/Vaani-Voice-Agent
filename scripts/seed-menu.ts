/**
 * Seed script: Vaani Café – Menu Data
 * Run: npx ts-node -r dotenv/config scripts/seed-menu.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env from project root (no dotenv dependency needed)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
    if (match) {
      const [, key, val] = match;
      if (!process.env[key]) process.env[key] = val.trim();
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

// ─── Seed Data ────────────────────────────────────────────────────────────────

const ORG_SLUG = 'vaani-cafe-demo';

const categories = [
  { name: 'Hot Beverages', display_order: 1 },
  { name: 'Cold Beverages', display_order: 2 },
  { name: 'Snacks & Starters', display_order: 3 },
  { name: 'Main Course', display_order: 4 },
  { name: 'Desserts', display_order: 5 },
];

const menuItems: Record<string, {
  name: string;
  description: string;
  price: number;
  spoken_aliases: string[];
  allergens: string[];
  prep_time_minutes: number;
  availability?: string;
}[]> = {
  'Hot Beverages': [
    {
      name: 'Classic Espresso',
      description: 'A single shot of rich, concentrated espresso with a velvety crema.',
      price: 120,
      spoken_aliases: ['espresso', 'short black', 'single shot'],
      allergens: [],
      prep_time_minutes: 3,
    },
    {
      name: 'Cappuccino',
      description: 'Espresso topped with equal parts steamed milk and thick foam.',
      price: 180,
      spoken_aliases: ['cappuccino', 'capp', 'frothy coffee'],
      allergens: ['milk'],
      prep_time_minutes: 5,
    },
    {
      name: 'Masala Chai Latte',
      description: 'Spiced Indian tea with ginger, cardamom, and cinnamon, frothed with steamed milk.',
      price: 150,
      spoken_aliases: ['masala chai', 'spiced tea', 'chai latte', 'chai'],
      allergens: ['milk'],
      prep_time_minutes: 7,
    },
    {
      name: 'Hot Chocolate',
      description: 'Creamy Belgian chocolate melted with steamed milk, topped with whipped cream.',
      price: 200,
      spoken_aliases: ['hot choco', 'chocolate drink', 'cocoa'],
      allergens: ['milk', 'soy'],
      prep_time_minutes: 6,
    },
  ],
  'Cold Beverages': [
    {
      name: 'Cold Brew Coffee',
      description: '18-hour cold-steeped coffee, smooth and low in acidity, served over ice.',
      price: 220,
      spoken_aliases: ['cold brew', 'iced coffee', 'cold coffee'],
      allergens: [],
      prep_time_minutes: 2,
    },
    {
      name: 'Mango Lassi',
      description: 'Fresh Alphonso mango blended with yogurt and a hint of cardamom.',
      price: 160,
      spoken_aliases: ['mango lassi', 'mango drink', 'lassi'],
      allergens: ['milk'],
      prep_time_minutes: 5,
    },
    {
      name: 'Watermelon Mint Cooler',
      description: 'Fresh watermelon juice blended with mint and a squeeze of lime.',
      price: 140,
      spoken_aliases: ['watermelon cooler', 'mint cooler', 'watermelon juice'],
      allergens: [],
      prep_time_minutes: 5,
    },
  ],
  'Snacks & Starters': [
    {
      name: 'Masala Vada Pav',
      description: 'Spicy potato patty in a soft bun with chutneys – Mumbai street-food classic.',
      price: 80,
      spoken_aliases: ['vada pav', 'vada', 'potato bun'],
      allergens: ['gluten'],
      prep_time_minutes: 8,
    },
    {
      name: 'Cheese Garlic Bread',
      description: 'Toasted ciabatta slices with garlic butter, mozzarella, and herbs.',
      price: 130,
      spoken_aliases: ['garlic bread', 'cheese bread', 'cheesy garlic'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 10,
    },
    {
      name: 'Crispy Corn Chaat',
      description: 'Flash-fried baby corn tossed with onion, tomato, lime, and chaat masala.',
      price: 160,
      spoken_aliases: ['corn chaat', 'crispy corn', 'fried corn'],
      allergens: [],
      prep_time_minutes: 12,
    },
  ],
  'Main Course': [
    {
      name: 'Paneer Tikka Wrap',
      description: 'Char-grilled paneer and bell peppers wrapped in a whole-wheat tortilla with mint chutney.',
      price: 260,
      spoken_aliases: ['paneer wrap', 'tikka wrap', 'cottage cheese wrap'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 18,
    },
    {
      name: 'Avocado Toast',
      description: 'Sourdough topped with smashed avocado, cherry tomatoes, feta, and micro-greens.',
      price: 280,
      spoken_aliases: ['avocado toast', 'avo toast', 'avocado bread'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 12,
    },
    {
      name: 'Mushroom Pasta',
      description: 'Penne in a creamy garlic-mushroom sauce with Parmesan and fresh basil.',
      price: 320,
      spoken_aliases: ['mushroom pasta', 'pasta', 'creamy pasta'],
      allergens: ['gluten', 'milk'],
      prep_time_minutes: 20,
    },
    {
      name: 'Dal Makhani Bowl',
      description: 'Slow-cooked black lentils in a rich tomato-butter gravy, served with jeera rice.',
      price: 250,
      spoken_aliases: ['dal makhani', 'dal bowl', 'lentil bowl', 'black dal'],
      allergens: ['milk'],
      prep_time_minutes: 15,
    },
  ],
  'Desserts': [
    {
      name: 'Gulab Jamun',
      description: 'Soft milk-solid dumplings soaked in rose-saffron sugar syrup, served warm.',
      price: 120,
      spoken_aliases: ['gulab jamun', 'jamun', 'sweet dumplings'],
      allergens: ['milk', 'gluten'],
      prep_time_minutes: 5,
    },
    {
      name: 'Chocolate Brownie',
      description: 'Warm fudgy dark-chocolate brownie served with a scoop of vanilla ice cream.',
      price: 180,
      spoken_aliases: ['brownie', 'choco brownie', 'chocolate cake'],
      allergens: ['gluten', 'milk', 'eggs'],
      prep_time_minutes: 8,
    },
    {
      name: 'Mango Panna Cotta',
      description: 'Silky Italian set cream topped with fresh Alphonso mango coulis.',
      price: 160,
      spoken_aliases: ['panna cotta', 'mango dessert', 'Italian dessert'],
      allergens: ['milk'],
      prep_time_minutes: 3,
    },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Upsert organisation
    const orgRes = await client.query<{ id: string }>(
      `INSERT INTO organizations (name, slug, industry, default_currency, default_language, supported_languages)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['Vaani Cafe', ORG_SLUG, 'cafe', 'INR', 'en', ['en', 'hi']]
    );
    const orgId = orgRes.rows[0].id;
    console.log(`✅  Organisation: ${orgId}`);

    // 2. Upsert property
    const propRes = await client.query<{ id: string }>(
      `INSERT INTO properties (organization_id, name, property_type, city, timezone, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, 'Vaani Cafe - Main Branch', 'cafe', 'Mumbai', 'Asia/Kolkata', 'INR', 'active']
    );

    let propertyId: string;
    if (propRes.rows.length === 0) {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM properties WHERE organization_id = $1 AND name = $2 LIMIT 1`,
        [orgId, 'Vaani Cafe - Main Branch']
      );
      propertyId = existing.rows[0].id;
    } else {
      propertyId = propRes.rows[0].id;
    }
    console.log(`✅  Property: ${propertyId}`);

    // 3. Clear stale menu data for idempotent re-runs
    await client.query(`DELETE FROM menu_items WHERE property_id = $1`, [propertyId]);
    await client.query(`DELETE FROM menu_categories WHERE property_id = $1`, [propertyId]);
    console.log('🧹  Cleared old menu data');

    let totalItems = 0;

    // 4. Insert categories + items
    for (const cat of categories) {
      const catRes = await client.query<{ id: string }>(
        `INSERT INTO menu_categories (property_id, name, display_order)
         VALUES ($1, $2, $3) RETURNING id`,
        [propertyId, cat.name, cat.display_order]
      );
      const categoryId = catRes.rows[0].id;

      const items = menuItems[cat.name] ?? [];
      for (const item of items) {
        await client.query(
          `INSERT INTO menu_items
             (category_id, property_id, name, description, price, spoken_aliases, allergens, prep_time_minutes, availability)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            categoryId,
            propertyId,
            item.name,
            item.description,
            item.price,
            item.spoken_aliases,
            item.allergens,
            item.prep_time_minutes,
            item.availability ?? 'available',
          ]
        );
        totalItems++;
        console.log(`   ➕  ${cat.name} » ${item.name}  (Rs. ${item.price})`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n🎉  Done! Seeded ${totalItems} menu items across ${categories.length} categories.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed – rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
