#!/bin/bash

# 🗿 CHAD Maker - Automated Rebuild Script for VPS
# Usage: ./rebuild.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Auto-detect project directory
PROJECT_DIR="$(pwd)"
NGINX_SITE_DIR="/var/www/chadmaker.click"
SERVICE_NAME="nginx"

echo -e "${BLUE}🗿 Starting CHAD Maker rebuild process...${NC}"

# Function to print step
print_step() {
    echo -e "\n${YELLOW}🔄 $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
fi

print_step "Navigating to project directory..."
cd "$PROJECT_DIR" || {
    print_error "Failed to navigate to $PROJECT_DIR"
    exit 1
}

print_step "Pulling latest changes from Git..."
git fetch origin
git reset --hard origin/main
# Evita tocar nas pastas de backup antigas para não gerar avisos de permissão
git clean -fd -e 'dist.backup.*'
git pull origin main
print_success "Git pull completed"

print_step "Cleaning old files and cache..."
# Remove old node_modules if older than 7 days or if package.json changed
if [ -d "node_modules" ]; then
    if [ "package.json" -nt "node_modules" ] || [ $(find node_modules -maxdepth 0 -mtime +7 | wc -l) -gt 0 ]; then
        print_step "Removing old node_modules..."
        rm -rf node_modules
        print_success "Old node_modules removed"
    fi
fi

# Clean npm cache
npm cache clean --force
print_success "NPM cache cleaned"

# Remove old dist
if [ -d "dist" ]; then
    $SUDO rm -rf dist
    print_success "Old build files removed"
fi

print_step "Installing/updating dependencies..."
npm install
print_success "Dependencies installed"

print_step "Building the application..."
npm run build
print_success "Application built successfully"

print_step "Verifying build output..."
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    print_error "Build failed - index.html not found in dist"
    exit 1
fi

print_success "Build verification passed"

print_step "Updating web server files..."
# Create nginx directory if it doesn't exist
$SUDO mkdir -p "$NGINX_SITE_DIR"

# Copy new files to nginx directory
$SUDO cp -r dist/* "$NGINX_SITE_DIR/"

# Set proper permissions
$SUDO chown -R www-data:www-data "$NGINX_SITE_DIR"
$SUDO chmod -R 755 "$NGINX_SITE_DIR"

print_success "Web server files updated"

print_step "Testing Nginx configuration..."
$SUDO nginx -t
if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

print_step "Reloading Nginx..."
$SUDO systemctl reload nginx
print_success "Nginx reloaded"

print_step "Verifying services..."
# Check if nginx is running
if $SUDO systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running"
    $SUDO systemctl start nginx
fi

# Check if site is accessible
print_step "Testing site accessibility..."
if curl -f -s -o /dev/null "http://localhost"; then
    print_success "Site is accessible locally"
else
    print_error "Site is not accessible locally"
fi

print_step "Running final health check..."
# Check if all required files exist
REQUIRED_FILES=("index.html" "assets")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$NGINX_SITE_DIR/$file" ]; then
        print_error "Required file/directory missing: $file"
        exit 1
    fi
done

print_success "Health check passed"

echo -e "\n${GREEN}🎉 CHAD Maker rebuild completed successfully!${NC}"
echo -e "${BLUE}📊 Build Summary:${NC}"
echo -e "  • Git: $(git rev-parse --short HEAD) - $(git log -1 --pretty=format:'%s')"
echo -e "  • Build time: $(date)"
echo -e "  • Files deployed to: $NGINX_SITE_DIR"
echo -e "  • Service status: $(systemctl is-active nginx)"

echo -e "\n${YELLOW}🔗 Quick checks:${NC}"
echo -e "  • Local test: curl http://localhost"
echo -e "  • Site logs: sudo tail -f /var/log/nginx/access.log"
echo -e "  • Error logs: sudo tail -f /var/log/nginx/error.log"

print_success "🗿 CHAD Maker is ready to rock!"