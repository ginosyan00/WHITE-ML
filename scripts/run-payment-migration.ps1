# Payment Gateway Migration Script (PowerShell)
# 
# This script runs the payment gateway migration
# Make sure DATABASE_URL is set in .env file

Write-Host "💳 [PAYMENT MIGRATION] Starting payment gateway migration..." -ForegroundColor Cyan

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ [PAYMENT MIGRATION] Error: DATABASE_URL is not set" -ForegroundColor Red
    Write-Host "   Please set DATABASE_URL in .env file" -ForegroundColor Yellow
    exit 1
}

# Navigate to db package
Set-Location packages/db
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ [PAYMENT MIGRATION] Error: Could not navigate to packages/db" -ForegroundColor Red
    exit 1
}

# Generate Prisma Client
Write-Host "📦 [PAYMENT MIGRATION] Generating Prisma Client..." -ForegroundColor Cyan
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ [PAYMENT MIGRATION] Error: Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Run migration
Write-Host "🔄 [PAYMENT MIGRATION] Running migration..." -ForegroundColor Cyan
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  [PAYMENT MIGRATION] Migration failed, trying db:push..." -ForegroundColor Yellow
    npm run db:push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ [PAYMENT MIGRATION] Error: Failed to run migration" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ [PAYMENT MIGRATION] Migration completed!" -ForegroundColor Green


