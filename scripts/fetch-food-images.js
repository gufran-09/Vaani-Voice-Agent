const fs = require('fs');
const path = require('path');
const https = require('https');

const foodItems = [
  {
    slug: 'filter-coffee',
    name: 'South Indian Filter Coffee',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Filter_kaapi.JPG',
  },
  {
    slug: 'masala-chai',
    name: 'Cutting Masala Chai',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Fancy_Cutting_Chai.jpg',
  },
  {
    slug: 'espresso',
    name: 'Classic Espresso',
    url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Tazzina_di_caff%C3%A8_a_Ventimiglia.jpg',
  },
  {
    slug: 'cappuccino',
    name: 'Cappuccino',
    url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Cappuccino_in_original.jpg',
  },
  {
    slug: 'chai-latte',
    name: 'Masala Chai Latte',
    url: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Latte_macchiato_with_coffee_beans.jpg',
  },
  {
    slug: 'hot-chocolate',
    name: 'Hot Chocolate',
    url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/After_The_St._Patrick%27s_Parade_Late_Lunch_%40_Lemon%2C_Dawson_Street%2C_Dublin%2C_Rep._Of_Ireland_A_Fine_Tradition%21_%286992614913%29.jpg',
  },
  {
    slug: 'cold-brew',
    name: 'Cold Brew Coffee',
    url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Preparation_of_cold_brew_coffee_06.jpg',
  },
  {
    slug: 'cold-coffee',
    name: 'Classic Cold Coffee',
    url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Caf%C3%A9_frapp%C3%A9_in_glass.jpg',
  },
  {
    slug: 'mango-lassi',
    name: 'Mango Lassi',
    url: 'https://images.unsplash.com/photo-1528498033373-3c6c08e93d79?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Mango_Lassi_.jpg',
  },
  {
    slug: 'watermelon-cooler',
    name: 'Watermelon Mint Cooler',
    url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/b/b6/20160812-AMS-LSC-0169_%2828963014995%29.jpg',
  },
  {
    slug: 'samosa',
    name: 'Samosa (2 pcs)',
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Samosas%2C_snack_food_at_Wikipedia%27s_16th_Birthday_celebration_in_Chittagong_%2801%29.jpg',
  },
  {
    slug: 'vada-pav',
    name: 'Masala Vada Pav',
    url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Vada_Pav-Indian_street_food.JPG',
  },
  {
    slug: 'veg-puff',
    name: 'Spiced Veg Puff',
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281744?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Karipap_Daging.jpg',
  },
  {
    slug: 'paneer-roll',
    name: 'Paneer Roll',
    url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Kolkata_Rolls.jpg',
  },
  {
    slug: 'paneer-tikka-wrap',
    name: 'Paneer Tikka Wrap',
    url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Paneer_tikka.jpg',
  },
  {
    slug: 'medu-vada',
    name: 'Medu Vada (2 pcs)',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Medu_Vadas.JPG',
  },
  {
    slug: 'cheese-garlic-bread',
    name: 'Cheese Garlic Bread',
    url: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Garlicbread.jpg',
  },
  {
    slug: 'corn-chaat',
    name: 'Crispy Corn Chaat',
    url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Corn_papdi_chaat.jpg',
  },
  {
    slug: 'bun-maska',
    name: 'Irani Bun Maska',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Bun_Maska_Pav.jpg',
  },
  {
    slug: 'masala-dosa',
    name: 'Tawa Masala Dosa',
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Dosa_at_Sri_Ganesha_Restauran%2C_Bangkok_%2844570742744%29.jpg',
  },
  {
    slug: 'avocado-toast',
    name: 'Avocado Toast',
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Avocado_toast_at_Voyager_Espresso_%2833134505776%29.jpg',
  },
  {
    slug: 'croissant',
    name: 'Butter Croissant',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Croissant-Petr_Kratochvil.jpg',
  },
  {
    slug: 'chocolate-muffin',
    name: 'Chocolate Muffin',
    url: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Chocolate_muffin_with_chocolate_chips.JPG',
  },
  {
    slug: 'chocolate-brownie',
    name: 'Warm Chocolate Brownie',
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Chocolatebrownie.JPG',
  },
  {
    slug: 'gulab-jamun',
    name: 'Gulab Jamun (2 pcs)',
    url: 'https://images.unsplash.com/photo-1605197584547-c93de1a02102?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Gulab-jamun-wallpaper-1.jpg',
  },
  {
    slug: 'mango-panna-cotta',
    name: 'Mango Panna Cotta',
    url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Panna_Cotta_with_cream_and_garnish.jpg',
  },
  {
    slug: 'dal-makhani',
    name: 'Dal Makhani Bowl',
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Punjabi_style_Dal_Makhani.jpg',
  },
  {
    slug: 'mushroom-pasta',
    name: 'Creamy Mushroom Pasta',
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281744?auto=format&fit=crop&w=600&q=80',
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Creamy_Mushroom_Pasta.jpg',
  },
];

const targetDir = path.resolve(__dirname, '..', 'public', 'images', 'food');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`Status ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            const size = fs.statSync(dest).size;
            if (size < 2000) {
              fs.unlinkSync(dest);
              return reject(new Error(`File too small: ${size} bytes`));
            }
            resolve(size);
          });
        });
      }
    );
    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
    req.setTimeout(12000, () => {
      req.destroy();
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(new Error('Timeout'));
    });
  });
}

async function run() {
  console.log(`Starting download for ${foodItems.length} food items...`);
  let successCount = 0;

  for (let i = 0; i < foodItems.length; i++) {
    const item = foodItems[i];
    const outPath = path.join(targetDir, `${item.slug}.jpg`);

    process.stdout.write(`[${i + 1}/${foodItems.length}] ${item.name} (${item.slug}.jpg)... `);

    let downloaded = false;
    try {
      const size = await download(item.url, outPath);
      console.log(`OK (${Math.round(size / 1024)} KB)`);
      downloaded = true;
    } catch (err1) {
      // Try fallback
      if (item.fallback) {
        try {
          const size = await download(item.fallback, outPath);
          console.log(`OK from fallback (${Math.round(size / 1024)} KB)`);
          downloaded = true;
        } catch (err2) {
          console.log(`FAILED (${err1.message}, fallback: ${err2.message})`);
        }
      } else {
        console.log(`FAILED (${err1.message})`);
      }
    }

    if (downloaded) successCount++;
    // Polite delay
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone! Successfully downloaded ${successCount}/${foodItems.length} images to ${targetDir}`);
}

run();
