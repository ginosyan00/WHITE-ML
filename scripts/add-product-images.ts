/**
 * Script to add images to existing products
 * Usage: npx tsx scripts/add-product-images.ts
 */

import { db } from "../packages/db";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Product images mapping
const productImages: Record<string, string[]> = {
  "iphone-15-pro": [
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop",
  ],
  "samsung-galaxy-s24": [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop",
  ],
  "nike-air-max-90": [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop",
  ],
  "adidas-originals-tshirt": [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop",
  ],
};

async function addProductImages() {
  console.log("🖼️  [IMAGES] Starting to add images to products...\n");

  try {
    // Get all products with their translations
    const products = await db.product.findMany({
      where: {
        published: true,
        deletedAt: null,
      },
      include: {
        translations: {
          where: { locale: "en" },
        },
      },
    });

    console.log(`📦 [IMAGES] Found ${products.length} products to update\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      const enTranslation = product.translations.find((t) => t.locale === "en");
      if (!enTranslation) {
        console.log(`⚠️  [IMAGES] Product ${product.id} has no English translation, skipping...`);
        skippedCount++;
        continue;
      }

      const slug = enTranslation.slug;
      const images = productImages[slug];

      if (!images) {
        console.log(`⚠️  [IMAGES] No images found for product "${enTranslation.title}" (slug: ${slug})`);
        skippedCount++;
        continue;
      }

      // Check if product already has images
      const hasImages = Array.isArray(product.media) && product.media.length > 0;
      if (hasImages) {
        console.log(`ℹ️  [IMAGES] Product "${enTranslation.title}" already has images, skipping...`);
        skippedCount++;
        continue;
      }

      // Format images as media array
      // Media can be either string URLs or objects with {url, alt, etc}
      const mediaArray = images.map((url) => ({
        url,
        type: "image",
        alt: enTranslation.title,
      }));

      // Update product with images
      await db.product.update({
        where: { id: product.id },
        data: {
          media: mediaArray,
        },
      });

      console.log(`✅ [IMAGES] Added ${images.length} images to "${enTranslation.title}"`);
      updatedCount++;

      // Also update variants with first image
      const variants = await db.productVariant.findMany({
        where: {
          productId: product.id,
          imageUrl: null,
        },
      });

      if (variants.length > 0 && images[0]) {
        await db.productVariant.updateMany({
          where: {
            productId: product.id,
            imageUrl: null,
          },
          data: {
            imageUrl: images[0],
          },
        });
        console.log(`   📸 Updated ${variants.length} variants with main image`);
      }
    }

    console.log(`\n✨ [IMAGES] Done!`);
    console.log(`   ✅ Updated: ${updatedCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products`);

  } catch (error: any) {
    console.error("\n❌ [IMAGES] Error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

addProductImages();

