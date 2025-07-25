#!/bin/bash

# QR Super Generator - Production Build Script
# Automated build process for Chrome Web Store deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="dist_chrome_prod"
SOURCE_DIR="src"
PACKAGE_JSON="package.json"
MANIFEST_JSON="manifest.json"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  QR Super Generator - Build    ${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_dependencies() {
    print_step "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check package.json
    if [ ! -f "$PACKAGE_JSON" ]; then
        print_error "package.json not found"
        exit 1
    fi
    
    # Check manifest.json
    if [ ! -f "$MANIFEST_JSON" ]; then
        print_error "manifest.json not found"
        exit 1
    fi
    
    print_success "All dependencies check passed"
}

clean_build() {
    print_step "Cleaning previous build..."
    
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
        print_success "Cleaned build directory"
    else
        print_success "Build directory doesn't exist, skipping clean"
    fi
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    npm ci --only=production
    print_success "Production dependencies installed"
}

run_tests() {
    print_step "Running tests..."
    
    # Check if test script exists
    if npm run test --silent > /dev/null 2>&1; then
        npm run test
        print_success "All tests passed"
    else
        print_warning "No test script found, skipping tests"
    fi
}

lint_code() {
    print_step "Running code linting..."
    
    # Check if lint script exists
    if npm run lint --silent > /dev/null 2>&1; then
        npm run lint
        print_success "Code linting passed"
    else
        print_warning "No lint script found, skipping linting"
    fi
}

build_extension() {
    print_step "Building extension for production..."
    
    # Set production environment
    export NODE_ENV=production
    export BABEL_ENV=production
    
    # Run production build
    npm run build:chrome:prod || {
        print_error "Build failed"
        exit 1
    }
    
    print_success "Extension built successfully"
}

optimize_assets() {
    print_step "Optimizing assets..."
    
    # Create assets directory if it doesn't exist
    mkdir -p "$BUILD_DIR/assets"
    
    # Copy and optimize images
    if [ -d "public" ]; then
        cp -r public/* "$BUILD_DIR/" 2>/dev/null || true
        print_success "Public assets copied"
    fi
    
    # Copy manifest
    cp "$MANIFEST_JSON" "$BUILD_DIR/"
    print_success "Manifest copied"
    
    # Copy locales if they exist
    if [ -d "$SOURCE_DIR/locales" ]; then
        cp -r "$SOURCE_DIR/locales" "$BUILD_DIR/"
        print_success "Locales copied"
    fi
}

validate_build() {
    print_step "Validating build..."
    
    # Check if build directory exists
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build directory not found"
        exit 1
    fi
    
    # Check manifest.json
    if [ ! -f "$BUILD_DIR/manifest.json" ]; then
        print_error "manifest.json not found in build"
        exit 1
    fi
    
    # Check required assets
    required_files=(
        "manifest.json"
        "icon-128.png"
        "icon-32.png"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$BUILD_DIR/$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Validate manifest.json
    if command -v jq &> /dev/null; then
        if ! jq . "$BUILD_DIR/manifest.json" > /dev/null 2>&1; then
            print_error "Invalid manifest.json format"
            exit 1
        fi
        print_success "Manifest validation passed"
    else
        print_warning "jq not found, skipping manifest validation"
    fi
    
    print_success "Build validation passed"
}

generate_build_info() {
    print_step "Generating build information..."
    
    # Create build info file
    cat > "$BUILD_DIR/build-info.json" << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(node -p "require('./package.json').version")",
  "nodeVersion": "$(node --version)",
  "platform": "$(uname -s)",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "buildType": "production"
}
EOF
    
    print_success "Build information generated"
}

calculate_bundle_size() {
    print_step "Calculating bundle sizes..."
    
    if command -v du &> /dev/null; then
        total_size=$(du -sh "$BUILD_DIR" | cut -f1)
        js_size=$(find "$BUILD_DIR" -name "*.js" -type f -exec du -ch {} + | grep total | cut -f1)
        css_size=$(find "$BUILD_DIR" -name "*.css" -type f -exec du -ch {} + | grep total | cut -f1)
        
        echo ""
        echo -e "${BLUE}Bundle Size Report:${NC}"
        echo -e "  Total: ${GREEN}$total_size${NC}"
        echo -e "  JavaScript: ${GREEN}$js_size${NC}"
        echo -e "  CSS: ${GREEN}$css_size${NC}"
        echo ""
    fi
}

security_check() {
    print_step "Running security checks..."
    
    # Check for common security issues
    security_issues=()
    
    # Check for console.log in production files
    if grep -r "console\.log" "$BUILD_DIR"/*.js 2>/dev/null; then
        security_issues+=("console.log found in production files")
    fi
    
    # Check for eval usage
    if grep -r "eval(" "$BUILD_DIR"/*.js 2>/dev/null; then
        security_issues+=("eval() usage found")
    fi
    
    # Check for inline scripts in HTML
    if grep -r "javascript:" "$BUILD_DIR"/*.html 2>/dev/null; then
        security_issues+=("Inline JavaScript found in HTML")
    fi
    
    if [ ${#security_issues[@]} -eq 0 ]; then
        print_success "Security checks passed"
    else
        print_warning "Security issues found:"
        for issue in "${security_issues[@]}"; do
            echo -e "  ${YELLOW}- $issue${NC}"
        done
    fi
}

print_build_summary() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}     Build Completed!           ${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "Build output: ${BLUE}$BUILD_DIR${NC}"
    echo -e "Version: ${GREEN}$(node -p "require('./package.json').version")${NC}"
    echo -e "Build time: ${GREEN}$(date)${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Test the extension: Load $BUILD_DIR in Chrome"
    echo -e "2. Create store package: Run ./scripts/package.sh"
    echo -e "3. Upload to Chrome Web Store"
    echo ""
}

# Main execution
main() {
    print_header
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_LINT=false
    ANALYZE_BUNDLE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-lint)
                SKIP_LINT=true
                shift
                ;;
            --analyze)
                ANALYZE_BUNDLE=true
                export ANALYZE=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests    Skip running tests"
                echo "  --skip-lint     Skip code linting"
                echo "  --analyze       Generate bundle analysis"
                echo "  --help, -h      Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Execute build steps
    check_dependencies
    clean_build
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    if [ "$SKIP_LINT" = false ]; then
        lint_code
    else
        print_warning "Skipping linting"
    fi
    
    build_extension
    optimize_assets
    validate_build
    generate_build_info
    calculate_bundle_size
    security_check
    
    print_build_summary
    
    if [ "$ANALYZE_BUNDLE" = true ]; then
        echo -e "${BLUE}Opening bundle analyzer...${NC}"
        open "$BUILD_DIR/bundle-report.html" 2>/dev/null || true
    fi
}

# Error handling
trap 'print_error "Build failed on line $LINENO"' ERR

# Run main function
main "$@" 