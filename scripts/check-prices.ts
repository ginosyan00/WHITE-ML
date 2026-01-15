/**
 * Script to check current prices in database
 */

import { db } from "../packages/db";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function checkPrices() {
  try {
    const variants = await db.productVariant.findMany({
      where: {
        product: {
          published: true,
          deletedAt: null,
        },
      },
      include: {
        product: {
          include: {
            translations: {
              where: { locale: "en" },
            },
          },
        },
      },
      take: 10,
    });

    console.log("💰 Current prices:\n");
    variants.forEach((v) => {
      const productName = v.product.translations[0]?.title || v.product.id;
      console.log(`  ${productName}: ${v.price} AMD (SKU: ${v.sku || "N/A"})`);
    });

    const allPrices = await db.productVariant.findMany({
      where: {
        product: {
          published: true,
          deletedAt: null,
        },
      },
      select: { price: true },
    });

    const uniquePrices = [...new Set(allPrices.map((v) => v.price))];
    console.log(`\n📊 Unique prices found: ${uniquePrices.join(", ")}`);
    console.log(`📊 Total variants: ${allPrices.length}`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await db.$disconnect();
  }
}

checkPrices();

