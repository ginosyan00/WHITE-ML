import { NextResponse } from "next/server";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🔌 [TEST] Testing database connection...");
    console.log("🔌 [TEST] DATABASE_URL:", process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : "NOT SET");
    
    // Test basic connection
    await db.$connect();
    console.log("✅ [TEST] Database connected successfully!");
    
    // Test query - get product count
    const productCount = await db.product.count({
      where: {
        published: true,
        deletedAt: null,
      },
    });
    console.log(`📦 [TEST] Total published products: ${productCount}`);
    
    // Test query - get category count
    const categoryCount = await db.category.count({
      where: {
        published: true,
        deletedAt: null,
      },
    });
    console.log(`📁 [TEST] Total published categories: ${categoryCount}`);
    
    // Test query - get a few products with translations
    const products = await db.product.findMany({
      where: {
        published: true,
        deletedAt: null,
      },
      take: 5,
      include: {
        translations: {
          take: 1,
        },
        variants: {
          where: {
            published: true,
          },
          take: 1,
        },
      },
    });
    
    const productList = products.map((product) => ({
      id: product.id,
      title: product.translations[0]?.title || "No title",
      slug: product.translations[0]?.slug || "no-slug",
      published: product.published,
      variantCount: product.variants.length,
      hasImage: Array.isArray(product.media) && product.media.length > 0,
    }));
    
    // Test categories
    const categories = await db.category.findMany({
      where: {
        published: true,
        deletedAt: null,
      },
      take: 5,
      include: {
        translations: {
          take: 1,
        },
      },
    });
    
    const categoryList = categories.map((cat) => ({
      id: cat.id,
      title: cat.translations[0]?.title || "No title",
      slug: cat.translations[0]?.slug || "no-slug",
    }));
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      database: {
        url: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : "NOT SET",
      },
      counts: {
        products: productCount,
        categories: categoryCount,
      },
      sample: {
        products: productList,
        categories: categoryList,
      },
    });
  } catch (error: any) {
    console.error("❌ [TEST] Database connection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.toString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        databaseUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : "NOT SET",
      },
      { status: 500 }
    );
  }
}



