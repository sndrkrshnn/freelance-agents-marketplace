#!/bin/bash

# ============================================
# Render.com Setup Script
# Freelance AI Agents Marketplace
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="freelance-agents-marketplace"
REPO_URL=""
REGION="oregon"  # Oregon is recommended for free tier

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${GREEN}$1${NC}\n"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate input
validate_input() {
    if [ -z "$1" ]; then
        print_error "$2 is required"
        exit 1
    fi
}

# Print banner
print_header "=========================================
Freelance AI Agents Marketplace
Render.com Setup Script
========================================="

print_info "This script will guide you through setting up your project on Render.com"
print_info "Prerequisites:"
echo "  - A GitHub account"
echo "  - A Render.com account (free tier)"
echo "  - Your code pushed to GitHub"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists git; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi
print_success "Git is installed"

if ! command_exists render; then
    print_warning "Render CLI is not installed"
    print_info "Installing Render CLI..."
    curl -o render.deb -L https://github.com/renderinc/cli/releases/download/v0.1.15/render_0.1.15_linux_amd64.deb
    sudo dpkg -i render.deb || sudo apt-get install -f -y
    rm render.deb
    print_success "Render CLI installed"
else
    print_success "Render CLI is installed"
fi

# Check if user is logged in
print_info "Checking Render authentication..."
if ! render whoami &>/dev/null; then
    print_warning "Not logged in to Render"
    print_info "Please login to Render.com CLI"
    render login
    if [ $? -ne 0 ]; then
        print_error "Failed to login to Render"
        exit 1
    fi
fi
print_success "Authenticated with Render"

# Get repository URL
print_header "Step 1: Link GitHub Repository"
print_info "Please provide your GitHub repository URL"
print_info "Format: https://github.com/username/repo-name"
read -p "Repository URL: " REPO_URL
validate_input "$REPO_URL" "Repository URL"

# Check if git repo
if [ -d ".git" ]; then
    print_info "Git repository detected"
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [ -n "$REMOTE_URL" ]; then
        print_info "Current remote: $REMOTE_URL"
        read -p "Use this repository? (y/n): " USE_CURRENT
        if [ "$USE_CURRENT" = "y" ] || [ "$USE_CURRENT" = "Y" ]; then
            REPO_URL="$REMOTE_URL"
        fi
    fi
fi

# Ask for project creation
print_header "Step 2: Create Render Project"
print_info "A project groups all your services together"
read -p "Create a new Render project? (y/n): " CREATE_PROJECT

if [ "$CREATE_PROJECT" = "y" ] || [ "$CREATE_PROJECT" = "Y" ]; then
    print_info "Creating Render project..."
    # Note: render create-project is not a v1 command
    # Project is created when you create first service
    print_success "Project will be created when services are deployed"
fi

# Step 3: Environment Variables
print_header "Step 3: Configure Environment Variables"
print_info "We'll generate secure secrets for your production deployment"
print_warning "You can update these later in the Render dashboard"

# Generate JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
STRIPE_WEBHOOK_SECRET=$(openssl rand -base64 32)

print_success "Generated secure secrets"

# Get Stripe keys
print_info "Stripe configuration (optional, can skip for now)"
read -p "Enter Stripe Secret Key (press Enter to skip): " STRIPE_SECRET_KEY
read -p "Enter Stripe Webhook Secret (press Enter to skip): " STRIPE_WEBHOOK_SECRET_INPUT
if [ -n "$STRIPE_WEBHOOK_SECRET_INPUT" ]; then
    STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET_INPUT"
fi

# Get frontend URL
print_info "Frontend configuration"
read -p "Enter Vercel frontend URL (default: https://freelance-agents-marketplace.vercel.app): " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-"https://freelance-agents-marketplace.vercel.app"}
CORS_ORIGIN="$FRONTEND_URL"

# Step 4: Deploy
print_header "Step 4: Deploy to Render"
print_info "Review your configuration:"
echo ""
echo "Repository: $REPO_URL"
echo "Region: $REGION"
echo "Frontend URL: $FRONTEND_URL"
echo ""

read -p "Proceed with deployment? (y/n): " PROCEED
if [ "$PROCEED" != "y" ] && [ "$PROCEED" != "Y" ]; then
    print_info "Deployment cancelled"
    exit 0
fi

# Update render.yaml with custom values
print_info "Updating render.yaml with your configuration..."
if [ -f "render.yaml" ]; then
    sed -i "s|https://freelance-agents-marketplace.vercel.app|$FRONTEND_URL|g" render.yaml
    print_success "render.yaml updated"
fi

# Deploy using render.yaml
print_info "Deploying services using render.yaml..."
print_warning "This may take several minutes on first deployment"

# Note: render CLI doesn't have direct support for render.yaml
# You'll need to create services manually in dashboard or use GitHub integration
print_info "Please follow these steps:"
echo ""
echo "1. Go to https://dashboard.render.com/"
echo "2. Click 'New +' and select 'Web Service'"
echo "3. Connect your GitHub repository: $REPO_URL"
echo "4. Select the branch (usually 'main')"
echo "5. Render will automatically detect render.yaml"
echo "6. Review and click 'Deploy'"
echo ""
print_info "Alternatively, you can deploy each service manually:"
echo ""
echo "PostgreSQL Database:"
echo "  - Create PostgreSQL service"
echo "  - Keep default settings (free tier)"
echo "  - Note internal database URL"
echo ""
echo "Redis:"
echo "  - Create Redis instance"
echo "  - Keep default settings (free tier)"
echo "  - Note internal Redis URL"
echo ""
echo "Backend API:"
echo "  - Create Web Service"
echo "  - Select Docker runtime"
echo "  - Set dockerfile path: backend/Dockerfile"
echo "  - Set build context: backend"
echo "  - Add environment variables from above"
echo "  - Set health check path: /health"
echo ""

# Export environment variables to file
ENV_FILE=".render.env.generated"
cat > "$ENV_FILE" << EOF
# Generated Environment Variables for Render
# Generated on: $(date)
# DO NOT commit to Git

# Database URLs (will be provided by Render)
DATABASE_URL=
REDIS_URL=

# Secrets (add these to Render)
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
STRIP_SECRET_KEY=$STRIPE_SECRET_KEY

# Frontend URL
CORS_ORIGIN=$CORS_ORIGIN
FRONTEND_URL=$FRONTEND_URL
EOF

print_success "Environment variables saved to: $ENV_FILE"
print_warning "Add these to your Render service configuration"

# Step 5: Verification
print_header "Step 5: Post-Deployment Setup"
print_info "After deployment is complete:"

echo ""
echo "1. Get your API URL from Render dashboard"
echo "2. Update frontend VITE_API_URL environment variable"
echo "3. Test health endpoint: https://your-api.onrender.com/health"
echo "4. Test API endpoints"
echo "5. Verify database migrations ran successfully"
echo ""

# Frontend deployment notes
print_info "Frontend Deployment (Vercel):"
echo "1. Go to https://vercel.com/new"
echo "2. Import your GitHub repository"
echo "3. Set root directory: frontend"
echo "4. Add environment variable: VITE_API_URL=<your-render-api-url>"
echo "5. Click Deploy"
echo ""

# Monitoring setup
print_info "Monitoring Setup:"
echo "1. Enable logs in Render dashboard"
echo "2. Set up error alerts (email)"
echo "3. Monitor free tier usage"
echo "4. Note: Services spin down after 15min inactivity"
echo ""

# Success message
print_header "Setup Complete!"
print_success "Your Render deployment configuration is ready"
print_info "Next steps:"
echo "  1. Commit and push render.yaml to GitHub"
echo "  2. Create PostgreSQL service in Render dashboard"
echo "  3. Create Redis service in Render dashboard"
echo "  4. Create backend web service in Render dashboard"
echo "  5. Get API URL and configure frontend"
echo "  6. Deploy frontend to Vercel"
echo ""
print_info "Documentation: docs/DEPLOYMENT_RENDER.md"
print_info "Need help? https://render.com/docs"

exit 0
