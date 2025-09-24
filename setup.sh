#!/bin/bash

# Modern Monaco Self-Hosted Example Setup Script
# This script sets up the complete self-hosted example

set -e  # Exit on any error

echo "🚀 Setting up Modern Monaco Self-Hosted Example"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the examples/self-hosted directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Step 1: Build modern-monaco if needed
print_status "Checking modern-monaco build..."
if [ ! -d "../../dist" ]; then
    print_warning "Modern-monaco dist directory not found. Building now..."
    cd ../../
    
    if [ ! -f "package.json" ]; then
        print_error "Could not find modern-monaco root directory"
        exit 1
    fi
    
    print_status "Installing modern-monaco dependencies..."
    npm install
    
    print_status "Building modern-monaco..."
    npm run prepublishOnly
    
    cd examples/self-hosted
    print_success "Modern-monaco built successfully"
else
    print_success "Modern-monaco dist directory found"
fi

# Step 2: Install dependencies
print_status "Installing project dependencies..."
npm install

# Step 3: Build the project
print_status "Building the project..."
npm run build

# Step 4: Copy modern-monaco files
print_status "Copying modern-monaco distribution files..."
npm run copy-monaco

# Step 5: Verify setup
print_status "Verifying setup..."

# Check if critical files exist
CRITICAL_FILES=(
    "public/index.html"
    "public/dist/app.js"
    "public/monaco/index.mjs"
    "public/monaco/editor-core.mjs"
    "public/monaco/editor-worker-main.mjs"
    "public/monaco/lsp/typescript/worker.mjs"
    "public/monaco/onig.wasm"
)

ALL_FILES_EXIST=true
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file"
    else
        print_error "✗ $file (missing)"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
    print_error "Some critical files are missing. Setup incomplete."
    exit 1
fi

print_success "All critical files verified"

# Step 6: Display completion message
echo ""
echo "🎉 Setup completed successfully!"
echo "================================"
echo ""
echo "To start the development server:"
echo "  ${GREEN}npm run dev${NC}"
echo ""
echo "To start the production server:"
echo "  ${GREEN}npm start${NC}"
echo ""
echo "The application will be available at:"
echo "  ${BLUE}http://localhost:3000${NC}"
echo ""
echo "Debug endpoints:"
echo "  Health check: ${BLUE}http://localhost:3000/health${NC}"
echo "  File verification: ${BLUE}http://localhost:3000/debug/files${NC}"
echo ""
echo "For more information, see README.md"
echo ""

# Optional: Ask if user wants to start the dev server
read -p "Would you like to start the development server now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting development server..."
    npm run dev
fi
