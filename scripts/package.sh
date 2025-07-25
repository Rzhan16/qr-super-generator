#!/bin/bash

# QR Super Generator - Chrome Web Store Package Script
# Creates store-ready ZIP package for Chrome Web Store submission

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="dist_chrome_prod"
PACKAGE_DIR="store-package"
STORE_ASSETS_DIR="store-assets"
PACKAGE_NAME="qr-super-generator-chrome-store"
ZIP_NAME="${PACKAGE_NAME}.zip"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Chrome Web Store Packaging   ${NC}"
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

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if build directory exists
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build directory '$BUILD_DIR' not found. Run ./scripts/build.sh first."
        exit 1
    fi
    
    # Check if zip command exists
    if ! command -v zip &> /dev/null; then
        print_error "zip command not found. Please install zip utility."
        exit 1
    fi
    
    # Check manifest.json in build
    if [ ! -f "$BUILD_DIR/manifest.json" ]; then
        print_error "manifest.json not found in build directory"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

clean_package_dir() {
    print_step "Cleaning package directory..."
    
    if [ -d "$PACKAGE_DIR" ]; then
        rm -rf "$PACKAGE_DIR"
    fi
    
    mkdir -p "$PACKAGE_DIR"
    print_success "Package directory cleaned"
}

copy_extension_files() {
    print_step "Copying extension files..."
    
    # Copy all built files except development artifacts
    cp -r "$BUILD_DIR"/* "$PACKAGE_DIR/"
    
    # Remove development files that shouldn't be in store package
    dev_files=(
        "build-info.json"
        "bundle-report.html"
        "*.map"
        "*.gz"
        "hot-update.*"
        "webpack-dev-server.*"
    )
    
    for pattern in "${dev_files[@]}"; do
        find "$PACKAGE_DIR" -name "$pattern" -type f -delete 2>/dev/null || true
    done
    
    # Remove empty directories
    find "$PACKAGE_DIR" -type d -empty -delete 2>/dev/null || true
    
    print_success "Extension files copied"
}

validate_manifest() {
    print_step "Validating manifest for Chrome Web Store..."
    
    manifest_file="$PACKAGE_DIR/manifest.json"
    
    # Check manifest version
    manifest_version=$(jq -r '.manifest_version' "$manifest_file" 2>/dev/null || echo "unknown")
    if [ "$manifest_version" != "3" ]; then
        print_error "Manifest version must be 3 for Chrome Web Store"
        exit 1
    fi
    
    # Check required fields
    required_fields=("name" "version" "description" "icons")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$manifest_file" >/dev/null 2>&1; then
            print_error "Required manifest field missing: $field"
            exit 1
        fi
    done
    
    # Check permissions
    permissions=$(jq -r '.permissions[]?' "$manifest_file" 2>/dev/null || true)
    if echo "$permissions" | grep -q "http://\*" || echo "$permissions" | grep -q "https://\*"; then
        print_warning "Broad host permissions detected. Consider using activeTab instead."
    fi
    
    # Check for Chrome Web Store compliance
    name=$(jq -r '.name' "$manifest_file")
    description=$(jq -r '.description' "$manifest_file")
    
    if [ ${#name} -gt 45 ]; then
        print_warning "Extension name is longer than 45 characters (${#name})"
    fi
    
    if [ ${#description} -gt 132 ]; then
        print_warning "Description is longer than 132 characters (${#description})"
    fi
    
    print_success "Manifest validation passed"
}

check_file_sizes() {
    print_step "Checking file sizes for Chrome Web Store limits..."
    
    # Chrome Web Store limits
    MAX_PACKAGE_SIZE=$((20 * 1024 * 1024))  # 20MB
    MAX_FILE_SIZE=$((5 * 1024 * 1024))      # 5MB per file
    
    # Check total package size
    total_size=$(du -sb "$PACKAGE_DIR" | cut -f1)
    if [ "$total_size" -gt "$MAX_PACKAGE_SIZE" ]; then
        size_mb=$((total_size / 1024 / 1024))
        print_error "Package too large: ${size_mb}MB (max 20MB)"
        exit 1
    fi
    
    # Check individual file sizes
    large_files=()
    while IFS= read -r -d '' file; do
        file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
        if [ "$file_size" -gt "$MAX_FILE_SIZE" ]; then
            size_mb=$((file_size / 1024 / 1024))
            large_files+=("$(basename "$file"): ${size_mb}MB")
        fi
    done < <(find "$PACKAGE_DIR" -type f -print0)
    
    if [ ${#large_files[@]} -gt 0 ]; then
        print_error "Files exceed 5MB limit:"
        for file in "${large_files[@]}"; do
            echo -e "  ${RED}- $file${NC}"
        done
        exit 1
    fi
    
    size_mb=$((total_size / 1024 / 1024))
    print_success "File sizes OK (Total: ${size_mb}MB)"
}

remove_sensitive_data() {
    print_step "Removing sensitive data..."
    
    # Patterns to remove
    sensitive_patterns=(
        "*.log"
        "*.tmp"
        "*secret*"
        "*private*"
        "*.env"
        ".env.*"
        "node_modules"
        ".git"
        ".DS_Store"
        "Thumbs.db"
        "*.bak"
        "*.swp"
        "*.swo"
    )
    
    for pattern in "${sensitive_patterns[@]}"; do
        find "$PACKAGE_DIR" -name "$pattern" -exec rm -rf {} + 2>/dev/null || true
    done
    
    # Remove source maps in production
    find "$PACKAGE_DIR" -name "*.map" -delete 2>/dev/null || true
    
    print_success "Sensitive data removed"
}

optimize_for_store() {
    print_step "Optimizing for Chrome Web Store..."
    
    # Update manifest for store submission
    manifest_file="$PACKAGE_DIR/manifest.json"
    
    # Remove development-specific fields
    jq 'del(.key) | del(.update_url) | del(.oauth2)' "$manifest_file" > "${manifest_file}.tmp"
    mv "${manifest_file}.tmp" "$manifest_file"
    
    # Ensure proper permissions format
    # (Chrome Web Store doesn't like some permission formats)
    
    print_success "Store optimization completed"
}

create_store_package() {
    print_step "Creating Chrome Web Store package..."
    
    # Create ZIP file
    cd "$PACKAGE_DIR"
    zip -r "../$ZIP_NAME" . -q
    cd ..
    
    # Verify ZIP was created
    if [ ! -f "$ZIP_NAME" ]; then
        print_error "Failed to create ZIP package"
        exit 1
    fi
    
    # Get ZIP size
    zip_size=$(du -h "$ZIP_NAME" | cut -f1)
    print_success "Package created: $ZIP_NAME ($zip_size)"
}

generate_submission_checklist() {
    print_step "Generating submission checklist..."
    
    version=$(jq -r '.version' "$PACKAGE_DIR/manifest.json")
    name=$(jq -r '.name' "$PACKAGE_DIR/manifest.json")
    
    cat > "store-submission-checklist.md" << EOF
# Chrome Web Store Submission Checklist

## Extension Details
- **Name**: $name
- **Version**: $version
- **Package**: $ZIP_NAME
- **Package Date**: $(date)

## Pre-Submission Checklist

### Required Assets ✓
- [ ] Extension package (.zip): \`$ZIP_NAME\`
- [ ] Store icon (128x128): Check \`$STORE_ASSETS_DIR/icon-store-128.png\`
- [ ] Small tile (440x280): Check \`$STORE_ASSETS_DIR/small-tile-440x280.png\`
- [ ] Large tile (1400x560): Check \`$STORE_ASSETS_DIR/large-tile-1400x560.png\`
- [ ] Screenshots (1280x800 or 640x400): Check \`$STORE_ASSETS_DIR/screenshots/\`

### Store Listing
- [ ] Detailed description (minimum 132 characters)
- [ ] Category selection
- [ ] Language selection
- [ ] Single purpose statement
- [ ] Privacy policy URL (if collecting user data)
- [ ] Support/homepage URL

### Technical Requirements
- [ ] Manifest V3 compliance
- [ ] No broad host permissions
- [ ] Proper content security policy
- [ ] All external requests justified
- [ ] No remote code execution
- [ ] Minimal permissions requested

### Content Guidelines
- [ ] No misleading functionality claims
- [ ] No copyrighted content without permission
- [ ] No spam or repetitive content
- [ ] User data handled securely
- [ ] Clear value proposition

### Testing
- [ ] Extension works in latest Chrome
- [ ] All features functional
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive (if applicable)

## Submission Steps

1. **Upload Package**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - Click "Add new item"
   - Upload \`$ZIP_NAME\`

2. **Complete Store Listing**
   - Upload all required images from \`$STORE_ASSETS_DIR/\`
   - Fill detailed description
   - Set category and language
   - Add privacy policy URL: https://your-domain.com/privacy-policy

3. **Set Pricing & Distribution**
   - Choose free or paid
   - Select regions
   - Set age rating

4. **Submit for Review**
   - Review all information
   - Submit for Chrome Web Store review
   - Monitor review status

## Post-Submission

- [ ] Monitor review status
- [ ] Respond to any review feedback
- [ ] Plan marketing strategy
- [ ] Set up analytics tracking
- [ ] Prepare update mechanism

---
Generated on $(date)
EOF

    print_success "Submission checklist created: store-submission-checklist.md"
}

validate_store_assets() {
    print_step "Validating store assets..."
    
    if [ ! -d "$STORE_ASSETS_DIR" ]; then
        print_warning "Store assets directory not found: $STORE_ASSETS_DIR"
        print_warning "Create store assets using: ./scripts/create-store-assets.sh"
        return
    fi
    
    # Required store assets
    required_assets=(
        "icon-store-128.png:128x128"
        "small-tile-440x280.png:440x280"
        "large-tile-1400x560.png:1400x560"
    )
    
    missing_assets=()
    for asset in "${required_assets[@]}"; do
        IFS=':' read -r filename dimensions <<< "$asset"
        if [ ! -f "$STORE_ASSETS_DIR/$filename" ]; then
            missing_assets+=("$filename ($dimensions)")
        fi
    done
    
    if [ ${#missing_assets[@]} -gt 0 ]; then
        print_warning "Missing store assets:"
        for asset in "${missing_assets[@]}"; do
            echo -e "  ${YELLOW}- $asset${NC}"
        done
    else
        print_success "All required store assets found"
    fi
    
    # Check screenshots
    if [ ! -d "$STORE_ASSETS_DIR/screenshots" ] || [ -z "$(ls -A "$STORE_ASSETS_DIR/screenshots" 2>/dev/null)" ]; then
        print_warning "No screenshots found in $STORE_ASSETS_DIR/screenshots/"
    else
        screenshot_count=$(ls -1 "$STORE_ASSETS_DIR/screenshots"/*.png 2>/dev/null | wc -l)
        print_success "Found $screenshot_count screenshot(s)"
    fi
}

print_package_summary() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}    Package Created!            ${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    
    version=$(jq -r '.version' "$PACKAGE_DIR/manifest.json")
    name=$(jq -r '.name' "$PACKAGE_DIR/manifest.json")
    zip_size=$(du -h "$ZIP_NAME" | cut -f1)
    file_count=$(find "$PACKAGE_DIR" -type f | wc -l)
    
    echo -e "Extension: ${GREEN}$name${NC}"
    echo -e "Version: ${GREEN}$version${NC}"
    echo -e "Package: ${BLUE}$ZIP_NAME${NC} ($zip_size)"
    echo -e "Files: ${GREEN}$file_count${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Review: store-submission-checklist.md"
    echo -e "2. Test: Load $PACKAGE_DIR in Chrome"
    echo -e "3. Upload: $ZIP_NAME to Chrome Web Store"
    echo -e "4. Assets: Prepare images from $STORE_ASSETS_DIR/"
    echo ""
}

# Main execution
main() {
    print_header
    
    # Parse command line arguments
    FORCE=false
    SKIP_VALIDATION=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --force             Overwrite existing package"
                echo "  --skip-validation   Skip manifest validation"
                echo "  --help, -h          Show this help message"
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
    
    # Check if package already exists
    if [ -f "$ZIP_NAME" ] && [ "$FORCE" = false ]; then
        print_error "Package already exists: $ZIP_NAME"
        echo "Use --force to overwrite"
        exit 1
    fi
    
    # Execute packaging steps
    check_prerequisites
    clean_package_dir
    copy_extension_files
    
    if [ "$SKIP_VALIDATION" = false ]; then
        validate_manifest
    else
        print_warning "Skipping manifest validation"
    fi
    
    check_file_sizes
    remove_sensitive_data
    optimize_for_store
    create_store_package
    generate_submission_checklist
    validate_store_assets
    
    print_package_summary
}

# Error handling
trap 'print_error "Packaging failed on line $LINENO"' ERR

# Run main function
main "$@" 