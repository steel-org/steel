# 🔄 Rebranding: Steel → Biuld

## Overview

This document outlines the complete rebranding process from **Steel** to **Biuld** for our real-time developer collaboration platform.

## Brand Identity Change

### Old Brand: Steel
- **Name**: Steel Chat
- **Tagline**: "Real-time developer collaboration"
- **Focus**: Strength, durability

### New Brand: Biuld
- **Name**: Biuld
- **Tagline**: "Real-time developer collaboration"
- **Focus**: Building, creating, Integrating, Linking, collaborative development
- **Unique Spelling**: "Biuld" (creative spelling of "Build")

## Files Requiring Updates

### 1. Frontend Configuration
- [ ] `package.json` - Update name and description
- [ ] `next.config.js` - Update app name references
- [ ] `public/manifest.json` - Update app name and description
- [ ] `pages/_document.js` - Update title and meta tags

### 2. Environment Files
- [ ] `.env.example` - Update `NEXT_PUBLIC_APP_NAME`
- [ ] `env.example` - Update `NEXT_PUBLIC_APP_NAME`

### 3. Component Updates
- [ ] `AuthModal.tsx` - Update branding text
- [ ] `Sidebar.tsx` - Update header title
- [ ] `ChatLayout.tsx` - Update loading text
- [ ] `Settings.tsx` - Update app references

### 4. Backend Updates
- [ ] `package.json` - Update name and description
- [ ] API response messages
- [ ] Logger messages
- [ ] Database schema comments

### 5. Documentation
- [ ] `README.md` - Complete rebrand
- [ ] `DEPLOYMENT_GUIDE.md` - Update titles and references
- [ ] `VERSIONING.md` - Update version headers
- [ ] `PROJECT_SUMMARY.md` - Update project description
- [ ] `SUPABASE_SETUP.md` - Update project references

### 6. Database & Storage
- [ ] Supabase project name (if needed)
- [ ] Storage bucket names
- [ ] Database names

## Implementation Steps

### Phase 1: Core Branding (Immediate)
1. Update main app title in components
2. Update environment variables
3. Update package.json files
4. Update README and main documentation

### Phase 2: Deep Integration (Next)
1. Update all UI text and messages
2. Update API responses
3. Update error messages
4. Update logging references

### Phase 3: External Services (Final)
1. Update deployment configurations
2. Update domain names (if applicable)
3. Update social media references
4. Update any external integrations

## Brand Guidelines

### Logo & Visual Identity
- **Primary Color**: Keep existing blue theme
- **Typography**: Modern, developer-friendly fonts
- **Icon**: Focus on building/construction metaphors

### Messaging
- **Tone**: Collaborative, innovative, developer-focused
- **Key Messages**:
  - "Build together, code together"
  - "Collaborative development made simple"
  - "Where developers build the future"

### Technical Naming Conventions
- **Repository**: `biuld` (lowercase)
- **Package Name**: `biuld`
- **Database**: `biuld`
- **Storage Bucket**: `biuld`

## Migration Checklist

### Environment Variables
```env
# Old
NEXT_PUBLIC_APP_NAME="Steel"

# New  
NEXT_PUBLIC_APP_NAME="Biuld"
```

### Package.json Updates
```json
{
  "name": "biuld-chat",
  "description": "Real-time collaborative development platform",
  "keywords": ["build", "collaboration", "development", "real-time", "integrate", "upload", "Link", "biuld"]
}
```

### Component Text Updates
```typescript
// Old
<h1>Steel Chat</h1>
<p>Steel v3.4.0 • Real-time developer collaboration</p>

// New
<h1>Biuld</h1>
<p>Biuld v4.0.0 • Real-time developer collaboration</p>
```

## Version Impact

### Current Version: v3.5.0
- This rebrand will be part of v3.5.0 release
- No breaking changes to functionality
- Only branding and naming updates

### Future Versions
- All future versions will use Biuld branding
- Documentation will reflect new brand identity
- API endpoints remain unchanged (backward compatibility)

## Rollback Plan

If needed, revert changes by:
1. Restore original environment variables
2. Revert component text changes
3. Update package.json back to Steel
4. Restore documentation files

## Timeline

- **Day 1**: Core branding updates (Phase 1)
- **Day 2-3**: Deep integration updates (Phase 2)  
- **Day 4-5**: External services and final testing (Phase 3)
- **Day 6**: Production deployment

## Notes

- Maintain all existing functionality
- Preserve user data and chat history
- Keep API compatibility
- Update deployment guides accordingly
- Test thoroughly before production release

---

**Status**: Planning Phase  
**Target Completion**: TBD  
**Responsible**: Development Team
