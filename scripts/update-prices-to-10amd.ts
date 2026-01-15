/**
 * Script to update all product prices to 10 AMD
 * Usage: npx tsx scripts/update-prices-to-10amd.ts
 */

import { db } from "../packages/db";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function updatePricesTo10AMD() {
  console.log("💰 [PRICES] Starting to update all product prices to 10 AMD...\n");

  try {
    // Get all published products with variants
    const products = await db.product.findMany({
      where: {
        published: true,
        deletedAt: null,
      },
      include: {
        translations: {
          where: { locale: "en" },
        },
        variants: true,
      },
    });

    console.log(`📦 [PRICES] Found ${products.length} products to update\n`);

    let totalVariantsUpdated = 0;

    for (const product of products) {
      const enTranslation = product.translations.find((t) => t.locale === "en");
      const productName = enTranslation?.title || product.id;

      if (product.variants.length === 0) {
        console.log(`⚠️  [PRICES] Product "${productName}" has no variants, skipping...`);
        continue;
      }

      // Update all variants to 10 AMD
      const result = await db.productVariant.updateMany({
        where: {
          productId: product.id,
        },
        data: {
          price: 10,
          compareAtPrice: null, // Remove compare price
        },
      });

      console.log(`✅ [PRICES] Updated ${result.count} variants for "${productName}" to 10 AMD`);
      totalVariantsUpdated += result.count;
    }

    console.log(`\n✨ [PRICES] Done!`);
    console.log(`   ✅ Total variants updated: ${totalVariantsUpdated}`);
    console.log(`   📦 Products processed: ${products.length}`);

    // Verify the update
    console.log(`\n🔍 [PRICES] Verifying prices...`);
    const allVariants = await db.productVariant.findMany({
      where: {
        product: {
          published: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        price: true,
        compareAtPrice: true,
      },
    });

    const prices = allVariants.map((v) => v.price);
    const uniquePrices = [...new Set(prices)];
    const allAre10 = uniquePrices.length === 1 && uniquePrices[0] === 10;

    if (allAre10) {
      console.log(`✅ [PRICES] Verification successful! All ${allVariants.length} variants have price 10 AMD`);
    } else {
      console.log(`⚠️  [PRICES] Warning: Found different prices: ${uniquePrices.join(", ")}`);
    }

  } catch (error: any) {
    console.error("\n❌ [PRICES] Error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

updatePricesTo10AMD();

