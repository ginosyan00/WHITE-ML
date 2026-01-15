/**
 * Comprehensive database seed script
 * Fills database with initial data: categories, brands, products, admin user, settings
 * Usage: npx tsx scripts/seed-database.ts
 */

import { db } from "../packages/db";
import * as dotenv from "dotenv";
import * as path from "path";
import * as bcrypt from "bcryptjs";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Helper to create translations
function createTranslations(locales: string[], data: Record<string, string>) {
  return locales.map((locale) => ({
    locale,
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value])
    ),
  }));
}

async function seedDatabase() {
  console.log("🌱 [SEED] Starting database seeding...\n");

  try {
    // 1. Create Admin User
    console.log("👤 [SEED] Creating admin user...");
    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@whiteshop.am";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";

    const existingAdmin = await db.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          firstName: "Admin",
          lastName: "User",
          roles: ["admin"],
          emailVerified: true,
          locale: "hy",
        },
      });
      console.log(`✅ [SEED] Admin user created: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log(`ℹ️  [SEED] Admin user already exists: ${adminEmail}`);
    }

    // 2. Create Categories
    console.log("\n📁 [SEED] Creating categories...");
    const categoriesData = [
      {
        slug: "electronics",
        translations: {
          hy: { title: "Էլեկտրոնիկա", slug: "elektronika" },
          ru: { title: "Электроника", slug: "elektronika" },
          en: { title: "Electronics", slug: "electronics" },
        },
        requiresSizes: false,
      },
      {
        slug: "clothing",
        translations: {
          hy: { title: "Հագուստ", slug: "hagust" },
          ru: { title: "Одежда", slug: "odezhda" },
          en: { title: "Clothing", slug: "clothing" },
        },
        requiresSizes: true,
      },
      {
        slug: "shoes",
        translations: {
          hy: { title: "Կոշիկներ", slug: "koshikner" },
          ru: { title: "Обувь", slug: "obuv" },
          en: { title: "Shoes", slug: "shoes" },
        },
        requiresSizes: true,
      },
      {
        slug: "accessories",
        translations: {
          hy: { title: "Աքսեսուարներ", slug: "aksesuarner" },
          ru: { title: "Аксессуары", slug: "aksessuary" },
          en: { title: "Accessories", slug: "accessories" },
        },
        requiresSizes: false,
      },
    ];

    const createdCategories = [];
    for (const catData of categoriesData) {
      const existing = await db.category.findFirst({
        where: {
          translations: {
            some: {
              slug: catData.translations.en.slug,
            },
          },
        },
      });

      if (!existing) {
        const category = await db.category.create({
          data: {
            published: true,
            requiresSizes: catData.requiresSizes,
            translations: {
              create: [
                {
                  locale: "hy",
                  title: catData.translations.hy.title,
                  slug: catData.translations.hy.slug,
                  fullPath: `/${catData.translations.hy.slug}`,
                },
                {
                  locale: "ru",
                  title: catData.translations.ru.title,
                  slug: catData.translations.ru.slug,
                  fullPath: `/${catData.translations.ru.slug}`,
                },
                {
                  locale: "en",
                  title: catData.translations.en.title,
                  slug: catData.translations.en.slug,
                  fullPath: `/${catData.translations.en.slug}`,
                },
              ],
            },
          },
        });
        createdCategories.push(category);
        console.log(`✅ [SEED] Category created: ${catData.translations.en.title}`);
      } else {
        createdCategories.push(existing);
        console.log(`ℹ️  [SEED] Category already exists: ${catData.translations.en.title}`);
      }
    }

    // 3. Create Brands
    console.log("\n🏷️  [SEED] Creating brands...");
    const brandsData = [
      {
        slug: "apple",
        translations: {
          hy: { name: "Apple", description: "Պրեմիում էլեկտրոնիկա" },
          ru: { name: "Apple", description: "Премиум электроника" },
          en: { name: "Apple", description: "Premium electronics" },
        },
      },
      {
        slug: "samsung",
        translations: {
          hy: { name: "Samsung", description: "Բարձրորակ տեխնիկա" },
          ru: { name: "Samsung", description: "Высококачественная техника" },
          en: { name: "Samsung", description: "High-quality technology" },
        },
      },
      {
        slug: "nike",
        translations: {
          hy: { name: "Nike", description: "Սպորտային հագուստ և կոշիկներ" },
          ru: { name: "Nike", description: "Спортивная одежда и обувь" },
          en: { name: "Nike", description: "Sportswear and shoes" },
        },
      },
      {
        slug: "adidas",
        translations: {
          hy: { name: "Adidas", description: "Սպորտային ապրանքներ" },
          ru: { name: "Adidas", description: "Спортивные товары" },
          en: { name: "Adidas", description: "Sports products" },
        },
      },
    ];

    const createdBrands = [];
    for (const brandData of brandsData) {
      const existing = await db.brand.findUnique({
        where: { slug: brandData.slug },
      });

      if (!existing) {
        const brand = await db.brand.create({
          data: {
            slug: brandData.slug,
            published: true,
            translations: {
              create: [
                {
                  locale: "hy",
                  name: brandData.translations.hy.name,
                  description: brandData.translations.hy.description,
                },
                {
                  locale: "ru",
                  name: brandData.translations.ru.name,
                  description: brandData.translations.ru.description,
                },
                {
                  locale: "en",
                  name: brandData.translations.en.name,
                  description: brandData.translations.en.description,
                },
              ],
            },
          },
        });
        createdBrands.push(brand);
        console.log(`✅ [SEED] Brand created: ${brandData.translations.en.name}`);
      } else {
        createdBrands.push(existing);
        console.log(`ℹ️  [SEED] Brand already exists: ${brandData.translations.en.name}`);
      }
    }

    // 4. Create Sample Products
    console.log("\n📦 [SEED] Creating sample products...");
    const productsData = [
      {
        brandSlug: "apple",
        categorySlug: "electronics",
        skuPrefix: "APP",
        translations: {
          hy: {
            title: "iPhone 15 Pro",
            slug: "iphone-15-pro",
            subtitle: "Նորագույն iPhone",
            descriptionHtml: "<p>Պրեմիում սմարթֆոն Apple-ից</p>",
          },
          ru: {
            title: "iPhone 15 Pro",
            slug: "iphone-15-pro",
            subtitle: "Новейший iPhone",
            descriptionHtml: "<p>Премиум смартфон от Apple</p>",
          },
          en: {
            title: "iPhone 15 Pro",
            slug: "iphone-15-pro",
            subtitle: "Latest iPhone",
            descriptionHtml: "<p>Premium smartphone from Apple</p>",
          },
        },
        price: 10,
        compareAtPrice: null,
        stock: 15,
        colors: ["Natural Titanium", "Blue Titanium", "White Titanium"],
      },
      {
        brandSlug: "samsung",
        categorySlug: "electronics",
        skuPrefix: "SAM",
        translations: {
          hy: {
            title: "Samsung Galaxy S24",
            slug: "samsung-galaxy-s24",
            subtitle: "Flagship սմարթֆոն",
            descriptionHtml: "<p>Բարձրակարգ Android սմարթֆոն</p>",
          },
          ru: {
            title: "Samsung Galaxy S24",
            slug: "samsung-galaxy-s24",
            subtitle: "Флагманский смартфон",
            descriptionHtml: "<p>Премиум Android смартфон</p>",
          },
          en: {
            title: "Samsung Galaxy S24",
            slug: "samsung-galaxy-s24",
            subtitle: "Flagship smartphone",
            descriptionHtml: "<p>Premium Android smartphone</p>",
          },
        },
        price: 10,
        compareAtPrice: null,
        stock: 20,
        colors: ["Phantom Black", "Marble Gray", "Cobalt Violet"],
      },
      {
        brandSlug: "nike",
        categorySlug: "shoes",
        skuPrefix: "NIK",
        translations: {
          hy: {
            title: "Nike Air Max 90",
            slug: "nike-air-max-90",
            subtitle: "Դասական սպորտային կոշիկներ",
            descriptionHtml: "<p>Հարմարավետ սպորտային կոշիկներ</p>",
          },
          ru: {
            title: "Nike Air Max 90",
            slug: "nike-air-max-90",
            subtitle: "Классические спортивные кроссовки",
            descriptionHtml: "<p>Удобные спортивные кроссовки</p>",
          },
          en: {
            title: "Nike Air Max 90",
            slug: "nike-air-max-90",
            subtitle: "Classic sport shoes",
            descriptionHtml: "<p>Comfortable sport shoes</p>",
          },
        },
        price: 10,
        compareAtPrice: null,
        stock: 30,
        sizes: ["40", "41", "42", "43", "44", "45"],
        colors: ["Black", "White", "Gray"],
      },
      {
        brandSlug: "adidas",
        categorySlug: "clothing",
        skuPrefix: "ADI",
        translations: {
          hy: {
            title: "Adidas Originals T-Shirt",
            slug: "adidas-originals-tshirt",
            subtitle: "Դասական T-Shirt",
            descriptionHtml: "<p>Հարմարավետ բամբակյա T-Shirt</p>",
          },
          ru: {
            title: "Adidas Originals Футболка",
            slug: "adidas-originals-tshirt",
            subtitle: "Классическая футболка",
            descriptionHtml: "<p>Удобная хлопковая футболка</p>",
          },
          en: {
            title: "Adidas Originals T-Shirt",
            slug: "adidas-originals-tshirt",
            subtitle: "Classic T-Shirt",
            descriptionHtml: "<p>Comfortable cotton T-Shirt</p>",
          },
        },
        price: 10,
        compareAtPrice: null,
        stock: 50,
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: ["Black", "White", "Navy"],
      },
    ];

    for (const prodData of productsData) {
      const brand = createdBrands.find((b) => b.slug === prodData.brandSlug);
      
      // Find category by English slug
      let category = null;
      for (const cat of createdCategories) {
        const catTranslations = await db.categoryTranslation.findMany({
          where: { categoryId: cat.id },
        });
        const enTranslation = catTranslations.find((t) => t.locale === "en");
        if (enTranslation && enTranslation.slug === prodData.categorySlug) {
          category = cat;
          break;
        }
      }

      if (!brand || !category) {
        console.log(`⚠️  [SEED] Skipping product "${prodData.translations.en.title}" - brand or category not found (brand: ${brand ? 'found' : 'not found'}, category: ${category ? 'found' : 'not found'})`);
        continue;
      }

      const existing = await db.product.findFirst({
        where: {
          translations: {
            some: {
              slug: prodData.translations.en.slug,
            },
          },
        },
      });

      if (existing) {
        console.log(`ℹ️  [SEED] Product already exists: ${prodData.translations.en.title}`);
        continue;
      }

      // Create product
      const product = await db.product.create({
        data: {
          brandId: brand.id,
          skuPrefix: prodData.skuPrefix,
          published: true,
          featured: true,
          publishedAt: new Date(),
          categoryIds: [category.id],
          primaryCategoryId: category.id,
          translations: {
            create: [
              {
                locale: "hy",
                title: prodData.translations.hy.title,
                slug: prodData.translations.hy.slug,
                subtitle: prodData.translations.hy.subtitle,
                descriptionHtml: prodData.translations.hy.descriptionHtml,
              },
              {
                locale: "ru",
                title: prodData.translations.ru.title,
                slug: prodData.translations.ru.slug,
                subtitle: prodData.translations.ru.subtitle,
                descriptionHtml: prodData.translations.ru.descriptionHtml,
              },
              {
                locale: "en",
                title: prodData.translations.en.title,
                slug: prodData.translations.en.slug,
                subtitle: prodData.translations.en.subtitle,
                descriptionHtml: prodData.translations.en.descriptionHtml,
              },
            ],
          },
          categories: {
            connect: { id: category.id },
          },
        },
      });

      // Create variants
      const colors = prodData.colors || ["Default"];
      const sizes = prodData.sizes || ["One Size"];

      for (const color of colors) {
        for (const size of sizes) {
          const sku = `${prodData.skuPrefix}-${color.substring(0, 3).toUpperCase()}-${size.toUpperCase()}`;
          await db.productVariant.create({
            data: {
              productId: product.id,
              sku: sku,
              price: prodData.price,
              compareAtPrice: prodData.compareAtPrice,
              stock: Math.floor(prodData.stock / (colors.length * sizes.length)),
              published: true,
            },
          });
        }
      }

      console.log(`✅ [SEED] Product created: ${prodData.translations.en.title}`);
    }

    // 5. Create Settings
    console.log("\n⚙️  [SEED] Creating settings...");
    const settingsData = [
      {
        key: "site.name",
        value: { hy: "White Shop", ru: "White Shop", en: "White Shop" },
        description: "Site name",
      },
      {
        key: "site.description",
        value: {
          hy: "Պրեմիում առցանց խանութ",
          ru: "Премиум интернет-магазин",
          en: "Premium online store",
        },
        description: "Site description",
      },
      {
        key: "currency",
        value: "AMD",
        description: "Default currency",
      },
      {
        key: "defaultLocale",
        value: "hy",
        description: "Default locale",
      },
    ];

    for (const setting of settingsData) {
      const existing = await db.settings.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        await db.settings.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
          },
        });
        console.log(`✅ [SEED] Setting created: ${setting.key}`);
      } else {
        console.log(`ℹ️  [SEED] Setting already exists: ${setting.key}`);
      }
    }

    console.log("\n✅ [SEED] Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log("   - Admin user created");
    console.log("   - Categories created");
    console.log("   - Brands created");
    console.log("   - Sample products created");
    console.log("   - Settings created");
    console.log("\n💡 You can now view data in Neon Console:");
    console.log("   https://console.neon.tech/app/projects/autumn-term-06749994/branches/br-spring-glitter-ahpgsx9m/tables");

  } catch (error: any) {
    console.error("\n❌ [SEED] Error seeding database:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedDatabase();

