#!/bin/bash

# Steel v3.4.0 - Local Development Setup Script
# This script automates the setup process for Steel development environment
# 
# What this script does:
# - Checks system prerequisites (Node.js, PostgreSQL, Redis)
# - Installs backend and frontend dependencies
# - Sets up environment configuration files
# - Initializes database with Prisma schema
# - Creates necessary directories
#
# Usage: ./setup.sh
# Requirements: Node.js 18+, PostgreSQL (optional for local dev)

set -e

echo "🚀 Steel Setup Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_status "Node.js $(node -v) is installed"
}

# Check if PostgreSQL is installed
check_postgres() {
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed. You'll need to install it manually."
        print_warning "Visit: https://www.postgresql.org/download/"
        print_warning "For Railway deployment, PostgreSQL is provided automatically."
        return 1
    fi
    
    print_status "PostgreSQL is installed"
    return 0
}

# Check if Redis is installed (optional)
check_redis() {
    if ! command -v redis-server &> /dev/null; then
        print_warning "Redis is not installed (optional). You can install it for session storage."
        print_warning "Visit: https://redis.io/download"
        print_warning "For Railway deployment, Redis is provided automatically."
        return 1
    fi
    
    print_status "Redis is installed"
    return 0
}

# Install backend dependencies
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Copy environment file
    if [ ! -f .env ]; then
        cp env.example .env
        print_status "Created .env file. Please edit it with your configuration."
    else
        print_warning ".env file already exists"
    fi
    
    cd ..
}

# Install frontend dependencies
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Copy environment file
    if [ ! -f .env.local ]; then
        cp env.example .env.local
        print_status "Created .env.local file. Please edit it with your configuration."
    else
        print_warning ".env.local file already exists"
    fi
    
    cd ..
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    cd backend
    
    # Check if .env exists
    if [ ! -f .env ]; then
        print_error ".env file not found. Please run setup_backend first."
        exit 1
    fi
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate
    
    # Push database schema
    print_status "Pushing database schema..."
    npx prisma db push
    
    cd ..
}

# Create logs directory
setup_logs() {
    print_status "Creating logs directory..."
    mkdir -p backend/logs
}

# Main setup function
main() {
    print_status "Starting Steel Chat setup..."
    
    # Check prerequisites
    check_node
    check_postgres
    check_redis
    
    # Setup components
    setup_backend
    setup_frontend
    setup_database
    setup_logs
    
    print_status "Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Edit backend/.env with your database and storage configuration"
    echo "2. Edit frontend/.env.local with your API URLs"
    echo "3. Start the backend: cd backend && npm run dev"
    echo "4. Start the frontend: cd frontend && npm run dev"
    echo ""
    echo "For production deployment, see DEPLOYMENT_GUIDE.md"
    echo "For version management, see VERSIONING.md"
    echo ""
    echo "For detailed instructions, see README.md and DEPLOYMENT_GUIDE.md"
}

# Run main function
main "$@" 