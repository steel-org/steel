# 📋 Steel - Version Management Guide

## Current Version: v3.2.3

Steel Chat follows [Semantic Versioning](https://semver.org/) (SemVer) for version management.

## Version Format

```
MAJOR.MINOR.PATCH
```

- **MAJOR** (v1.0.0): Breaking changes, major feature additions
- **MINOR** (v1.1.0): New features, backward compatible
- **PATCH** (v1.0.1): Bug fixes, backward compatible

## Version History

### v3.2.3 (Current) - Patch Release

**Release Date**: 12/08/2025
**Status**: Production Ready
**Type**: Patch

**Changes**:

- Version bump to v3.2.3 in all project files and UI components
- Fixed the parameter order in the frontend registration call to match the API service signature.
- Fixed parameter order mismatch in frontend registration call
- Synced all UI and API version references to 3.2.3
- Minor bug fixes and deployment improvements

### v3.2.2 (Previous) - Patch Release

**Release Date**: 11/08/2025
**Status**: Production Ready
**Type**: Patch

**Changes**:

- Version bump to v3.2.2 in documentation.
- Added S3/MinIO environment variables to backend env.example for persistent file and avatar storage.
- Fixed TypeScript errors in backend/src/routes/upload.ts
- Updated deployment instructions for S3/MinIO support.
- Made bio field in UserModal editable and included in profile update API.
- Minor bug fixes and deployment improvements.

### v3.2.1 - Patch Release

**Release Date**: 10/08/2025
**Status**: Production Ready
**Type**: Patch

**Changes**:

- Version bump to v3.2.1 in all project files and UI components
- Fixed backend build errors for Railway (PORT type, multer fileFilter, code paths)
- Updated Tailwind config to scan src/ for utility classes
- Removed version details from README.md and added clickable link to VERSIONING.md
- Synced all UI and API version references to 3.2.1
- Minor bug fixes and deployment improvements

### v3.2.0 - Previous Minor Release

**Release Date**: 10/08/2025
**Type**: Minor

**Changes**:

- Version bump to v3.2.0 in all project files
- Updated documentation and deployment guides
- Added avatar upload and serving endpoints in backend.
- Improved `UserModal` in frontend to support avatar upload, preview, and status selection.
- Updated `AuthModal` and other UI components to reflect new version and features.
- Updated deployment and versioning guides for v3.2.0.
- Minor bug fixes and refactoring for consistency.

### v3.1.0 - Previous Minor Release

**Release Date**: 10/08/2025
**Type**: Minor

**Changes**:

- Fixed incomplete TypeScript component implementations in frontend
- Completed ChatLayout.tsx, AuthModal.tsx, Sidebar.tsx, and ChatArea.tsx components
- Migrated from JavaScript (.js) to TypeScript (.tsx) for better type safety
- Improved component structure and type definitions
- Fixed build errors related to incomplete component coding
- Updated all version references across backend, frontend, and documentation
- Fixed TypeScript syntax errors in JavaScript files
- Synchronized version numbering across all project files
- Enhanced component prop typing and interface definitions

### v3.0.5 - Patch Release

**Type**: Patch

**Changes**:

- Incremented version to v3.0.5 in README and backend API version.
- Improved WebSocket authentication error handling and logging.
- Enhanced user online/offline notifications and message handling in WebSocket service.
- Updated Sidebar component to reflect the new version.
- Refactored code for better readability and consistency across multiple files

### v3.0.4 - Patch Release

**Type**: Patch

**Changes**:

- Fixed TypeScript build errors in middleware and routes
- Corrected jsonwebtoken typings and return paths
- Improved Prisma logging typings
- Fixed Prisma schema relation issues; clean build verified

### v3.0.3 - Patch Release

**Type**: Patch

**Changes**:

- Incremented version to v3.0.3 in backend and frontend package.json files.
- Updated VERSIONING.md to reflect the new patch release and document changes.
- Fixed TypeScript build errors in middleware and routes.
- Corrected jsonwebtoken typings and return paths.
- Improved Prisma logging typings.
- Changed Procfile to use npm start for web process.

### v3.0.2 - Patch Release

**Type**: Patch

**Changes**:

- Deleted vercel.json configuration file.
- Updated environment variable names in env.example and next.config.js.
- Modified ChatLayout to accommodate new environment variable structure.

### v3.0.1 - Patch Release

**Type**: Patch

**Changes**:

- Added vercel.json configuration for proper frontend build

### v3.0.0 - Major release

**Release Date**: 8/10/2025
**Status**: Production Ready

#### Major Features

- ✅ Real-time messaging with WebSocket
- ✅ Code sharing with Monaco Editor
- ✅ File upload and attachment system
- ✅ User authentication and authorization
- ✅ Group chat management
- ✅ Message reactions and editing
- ✅ Search functionality
- ✅ Desktop-ready architecture
- ✅ Production deployment guides
- ✅ Comprehensive testing suite

#### Technical Improvements

- TypeScript implementation
- Prisma ORM integration
- Socket.IO real-time communication
- S3-compatible file storage
- JWT authentication
- Rate limiting and security headers
- Comprehensive error handling

### v2.1.0 (Previous)

**Release Date**: Previous release
**Status**: Legacy

#### Features

- Basic chat functionality
- User registration and login
- Simple message sending
- Basic UI components

### v1.0.0 (Initial)

**Release Date**: Initial release
**Status**: Legacy

#### Features

- Project foundation
- Basic architecture setup
- Core dependencies

## Future Version Planning

### v3.3.0 (Next Minor Release)

**Target Date**: TBD
**Type**: Minor Release (New Features)

#### Planned Features

- [ ] Performance optimizations
- [ ] Enhanced error handling
- [ ] Improved accessibility
- [ ] Better mobile responsiveness
- [ ] Additional file type support
- [ ] Enhanced search capabilities
- [ ] User profile customization
- [ ] Message pinning feature

### v3.4.0 (Future Minor Release)

**Target Date**: TBD
**Type**: Minor Release (New Features)

#### Planned Features

- [ ] Video calls integration
- [ ] Screen sharing capabilities
- [ ] Advanced code collaboration
- [ ] Real-time code editing
- [ ] Integration with external tools
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Advanced security features

### v4.0.0 (Next Major Release)

**Target Date**: TBD
**Type**: Major Release (Breaking Changes)

#### Planned Features

- [ ] End-to-end encryption for messages
- [ ] Git integration (push/pull UI)
- [ ] Advanced search filters and indexing
- [ ] Message threading and replies
- [ ] Voice messages and audio sharing
- [ ] Enhanced file preview system
- [ ] Plugin architecture
- [ ] Custom themes and branding
- [ ] Mobile app companion
- [ ] Advanced notification system

## Version Update Process

### For Minor Releases (v3.3.0, v3.4.0, etc.)

1. **Update package.json versions**

   ```bash
   # Backend
   cd backend
   npm version patch  # or minor

   # Frontend
   cd ../frontend
   npm version patch  # or minor
   ```

2. **Update documentation**

   - Update README.md with new features
   - Update DEPLOYMENT_GUIDE.md if needed
   - Update VERSIONING.md with release notes

3. **Create release notes**
   - Document new features
   - List bug fixes
   - Note any breaking changes

### For Major Releases (v4.0.0, v5.0.0, etc.)

1. **Plan breaking changes**

   - Review API changes
   - Update database schema if needed
   - Plan migration strategy

2. **Update all version numbers**

   ```bash
   # Backend
   cd backend
   npm version major

   # Frontend
   cd ../frontend
   npm version major
   ```

3. **Update documentation comprehensively**

   - Major feature documentation
   - Migration guides
   - Breaking change notices

4. **Create comprehensive release notes**
   - Major feature highlights
   - Breaking changes
   - Migration instructions

## Version Compatibility

### Backend API Versions

- **v3.x.x**: Current API version
- **v2.x.x**: Legacy API (deprecated)
- **v1.x.x**: Legacy API (deprecated)

### Frontend Compatibility

- **v3.x.x**: Compatible with backend v3.x.x
- **v2.x.x**: Compatible with backend v2.x.x
- **v1.x.x**: Compatible with backend v1.x.x

## Release Checklist

### Before Release

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version numbers updated
- [ ] Release notes prepared
- [ ] Deployment tested

### During Release

- [ ] Create Git tag
- [ ] Update GitHub releases
- [ ] Deploy to production
- [ ] Monitor deployment health

### After Release

- [ ] Verify production deployment
- [ ] Monitor error logs
- [ ] Gather user feedback
- [ ] Plan next release

## Version Naming Conventions

### Release Types

- **Alpha** (v3.0.0-alpha.1): Pre-release testing
- **Beta** (v3.0.0-beta.1): Feature complete, testing
- **RC** (v3.0.0-rc.1): Release candidate
- **Stable** (v3.0.0): Production release

### Branch Naming

- `main`: Current stable version
- `develop`: Development branch
- `feature/v3.1.0-feature-name`: Feature branches
- `hotfix/v3.0.1-bug-fix`: Hotfix branches

## Migration Guides

### v2.x.x to v3.0.0

- Database schema changes
- API endpoint updates
- Authentication changes
- File storage configuration

### v3.0.x to v3.1.x

- Minor feature additions
- Performance improvements
- Bug fixes

### v3.x.x to v4.0.0 (Future)

- Major architectural changes
- Breaking API changes
- Database migrations
- New feature implementations

---

## Quick Reference

### Current Version

- **Backend**: v3.2.3
- **Frontend**: v3.2.3
- **Status**: Production Ready

### Next Release

- **Target**: v3.3.0
- **Type**: Minor Release
- **Focus**: Performance and UX improvements

### Version Commands

```bash
# Check current version
npm version

# Update to next patch version
npm version patch

# Update to next minor version
npm version minor

# Update to next major version
npm version major
```

---

_This versioning guide ensures consistent and predictable releases for Steel. For questions about versioning, refer to the contributing guidelines or contact the development team._
