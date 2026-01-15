import { NextResponse } from "next/server";
import { db } from "@white-shop/db";

export async function GET() {
  try {
    console.log("🔌 Testing database connection from API...");
    
    // Test basic connection
    await db.$connect();
    console.log("✅ Database connected successfully!");
    
    // Test query - get product count
    const productCount = await db.product.count();
    console.log(`📦 Total products in database: ${productCount}`);
    
    // Test query - get category count
    const categoryCount = await db.category.count();
    console.log(`📁 Total categories in database: ${categoryCount}`);
    
    // Test query - get a few products
    const products = await db.product.findMany({
      take: 5,
      include: {
        translations: {
          take: 1,
        },
        variants: {
          take: 1,
        },
      },
    });
    
    const productList = products.map((product) => ({
      id: product.id,
      title: product.translations[0]?.title || "No title",
      published: product.published,
      variantCount: product.variants.length,
    }));
    
    await db.$disconnect();
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      data: {
        productCount,
        categoryCount,
        products: productList,
      },
    });
  } catch (error: any) {
    console.error("❌ Database connection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}






