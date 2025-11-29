# Quick Setup Script for Kontrol

Write-Host "🚀 Setting up Kontrol - Microservice Scaffolder" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCheck) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker is installed" -ForegroundColor Green

# Check if Docker is running
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Create .env files if they don't exist
Write-Host "Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ Created backend\.env" -ForegroundColor Green
} else {
    Write-Host "ℹ️  backend\.env already exists" -ForegroundColor Cyan
}

if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "✅ Created frontend\.env" -ForegroundColor Green
} else {
    Write-Host "ℹ️  frontend\.env already exists" -ForegroundColor Cyan
}
Write-Host ""

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Yellow
$dirs = @("backend\temp", "backend\generated")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created $dir" -ForegroundColor Green
    }
}
Write-Host ""

# Ask user which setup method
Write-Host "How would you like to run Kontrol?" -ForegroundColor Cyan
Write-Host "1. Docker Compose (Recommended - All services in containers)"
Write-Host "2. Local Development (Node.js must be installed)"
Write-Host ""
$choice = Read-Host "Enter your choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "🐳 Starting Kontrol with Docker Compose..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This will:"
    Write-Host "  - Pull necessary Docker images"
    Write-Host "  - Build the frontend and backend containers"
    Write-Host "  - Start MongoDB database"
    Write-Host "  - Start all services"
    Write-Host ""
    Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow
    Write-Host ""
    
    docker-compose up --build
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "💻 Setting up for local development..." -ForegroundColor Cyan
    
    # Check Node.js
    Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCheck) {
        Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
        Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion is installed" -ForegroundColor Green
    Write-Host ""
    
    # Start MongoDB in Docker
    Write-Host "Starting MongoDB in Docker..." -ForegroundColor Yellow
    $mongoCheck = docker ps --filter "name=kontrol-mongodb" --format "{{.Names}}"
    if ($mongoCheck -ne "kontrol-mongodb") {
        docker run -d -p 27017:27017 --name kontrol-mongodb `
            -e MONGO_INITDB_ROOT_USERNAME=admin `
            -e MONGO_INITDB_ROOT_PASSWORD=kontrol_admin_pass `
            mongo:7
        Write-Host "✅ MongoDB started" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  MongoDB already running" -ForegroundColor Cyan
    }
    Write-Host ""
    
    # Install backend dependencies
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
    Write-Host ""
    
    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
    Write-Host ""
    
    # Instructions for running
    Write-Host "✅ Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the application, open TWO terminal windows:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Terminal 1 (Backend):" -ForegroundColor Yellow
    Write-Host "  cd backend"
    Write-Host "  npm run dev"
    Write-Host ""
    Write-Host "Terminal 2 (Frontend):" -ForegroundColor Yellow
    Write-Host "  cd frontend"
    Write-Host "  npm start"
    Write-Host ""
    Write-Host "Then visit: http://localhost:3000" -ForegroundColor Green
    
} else {
    Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🎉 Kontrol is ready!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Read SETUP.md for detailed usage instructions" -ForegroundColor Yellow
Write-Host ""
