#!/bin/bash

# Payment Gateway Migration Script
# 
# This script runs the payment gateway migration
# Make sure DATABASE_URL is set in .env file

echo "💳 [PAYMENT MIGRATION] Starting payment gateway migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ [PAYMENT MIGRATION] Error: DATABASE_URL is not set"
    echo "   Please set DATABASE_URL in .env file"
    exit 1
fi

# Navigate to db package
cd packages/db || exit 1

# Generate Prisma Client
echo "📦 [PAYMENT MIGRATION] Generating Prisma Client..."
npm run db:generate

# Run migration
echo "🔄 [PAYMENT MIGRATION] Running migration..."
npm run db:migrate

# Or use db:push for development
# npm run db:push

echo "✅ [PAYMENT MIGRATION] Migration completed!"

