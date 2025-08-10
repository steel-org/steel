# 🚀 Steel v3.2.0 - Production Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Performance Optimization](#performance-optimization)

## Overview

This guide provides step-by-step instructions for deploying Steel v3.2.0 to production environments. This version represents a major milestone with production-ready features including real-time messaging, code sharing, file uploads, and comprehensive deployment guides.

The application consists of:

- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: Next.js React application
- **Real-time Communication**: WebSocket support via Socket.IO
- **File Storage**: S3-compatible storage for file uploads
- **Code Editor**: Monaco Editor integration for code sharing

## Prerequisites

Before deployment, ensure you have:

- [ ] GitHub repository with Steel Chat codebase
- [ ] Node.js 18+ installed locally (for testing)
- [ ] Git configured with your credentials
- [ ] Access to deployment platforms (Railway, Vercel)

## Backend Deployment

### Recommended Platform: Railway

Railway is the recommended backend hosting platform due to its:

- Free PostgreSQL database provisioning
- Built-in Redis support
- Automatic environment variable management
- Zero-configuration deployments
- No credit card required for basic usage

### Step-by-Step Railway Deployment

#### 1. Platform Setup

1. Navigate to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with your GitHub account
4. Authorize Railway to access your repositories

#### 2. Project Configuration

1. Select "Deploy from GitHub repo"
2. Choose your `steel` repository
3. Click "Deploy Now"
4. In the project dashboard, navigate to "Settings"
5. Set "Root Directory" to `backend`
6. Save configuration

#### 3. Database Provisioning

1. In your Railway project dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway automatically creates and configures the database
4. The `DATABASE_URL` environment variable is automatically added

#### 4. Redis Configuration (Optional)

1. Click "New" → "Database" → "Add Redis"
2. Railway provisions a Redis instance
3. The `REDIS_URL` environment variable is automatically added

#### 5. Security Configuration

Generate a secure JWT secret using one of these methods:

**Method 1: Node.js (Recommended)**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Method 2: Online Generator**

1. Visit [generate-secret.vercel.app](https://generate-secret.vercel.app)
2. Set length to 64 characters
3. Copy the generated string

**Method 3: PowerShell (Windows)**

```powershell
$bytes = New-Object Byte[] 64
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[System.Convert]::ToHexString($bytes)
```

**Method 4: OpenSSL**

```bash
openssl rand -hex 64
```

**Method 5: Python**

```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

#### 6. Environment Variables Configuration

Navigate to the "Variables" tab in your Railway project and add:

```env
# Authentication
JWT_SECRET="your-generated-jwt-secret-here"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV=production

# Cross-Origin Resource Sharing
CORS_ORIGIN="https://your-frontend-url.vercel.app"

# File Upload Configuration
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES="image/*,application/zip,text/*,.ste,.py,.c,.cpp,.json"

# Logging
LOG_LEVEL=info
```

#### 7. File Storage Configuration

Choose one of the following options:

**Option A: Railway Built-in Storage (Recommended)**

- No additional configuration required
- Files stored securely within Railway infrastructure
- Automatic backup and redundancy

**Option B: AWS S3**

```env
S3_ENDPOINT="https://s3.amazonaws.com"
S3_ACCESS_KEY="your-aws-access-key"
S3_SECRET_KEY="your-aws-secret-key"
S3_BUCKET="your-bucket-name"
S3_REGION="us-east-1"
```

**Option C: MinIO (Free S3 Alternative)**

1. Create account at [cloud.min.io](https://cloud.min.io)
2. Create a bucket
3. Generate access keys
4. Configure environment variables with MinIO endpoint

**Option D: Disable File Uploads**

```env
S3_ENDPOINT=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_BUCKET=""
S3_REGION=""
```

#### 8. Deployment

1. Railway automatically deploys on GitHub pushes
2. Monitor deployment progress in the dashboard
3. Copy the generated deployment URL (e.g., `https://your-app.railway.app`)

## Frontend Deployment

### Platform: Vercel

Vercel is the recommended frontend hosting platform for Next.js applications.

### Step-by-Step Vercel Deployment

#### 1. Platform Setup

1. Navigate to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Authenticate with your GitHub account
4. Authorize Vercel to access your repositories

#### 2. Project Import

1. Click "New Project"
2. Select your `steel` repository
3. Click "Import"

#### 3. Project Configuration

1. Set "Root Directory" to `frontend`
2. Set "Framework Preset" to "Next.js"
3. Click "Deploy"

#### 4. Environment Variables Configuration

After initial deployment, configure environment variables:

1. Navigate to your project dashboard
2. Go to "Settings" → "Environment Variables"
3. Add the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL="https://your-backend-url.railway.app"
NEXT_PUBLIC_WS_URL="wss://your-backend-url.railway.app"
NEXT_PUBLIC_APP_NAME="Steel"

# Feature Flags
NEXT_PUBLIC_ENABLE_CODE_SHARING=true
NEXT_PUBLIC_ENABLE_FILE_UPLOAD=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

#### 5. Redeployment

1. After adding environment variables, click "Redeploy"
2. Your application will be available at `https://your-app.vercel.app`

## Environment Configuration

### Backend Environment Variables

| Variable             | Description                  | Required | Example                  |
| -------------------- | ---------------------------- | -------- | ------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string | Yes      | Auto-provided by Railway |
| `REDIS_URL`          | Redis connection string      | No       | Auto-provided by Railway |
| `JWT_SECRET`         | Secret for JWT token signing | Yes      | Generated 64-char string |
| `JWT_EXPIRES_IN`     | JWT token expiration         | No       | `7d`                     |
| `PORT`               | Server port                  | No       | `5000`                   |
| `NODE_ENV`           | Environment mode             | Yes      | `production`             |
| `CORS_ORIGIN`        | Allowed frontend origin      | Yes      | Your Vercel URL          |
| `MAX_FILE_SIZE`      | Maximum file upload size     | No       | `104857600`              |
| `ALLOWED_FILE_TYPES` | Permitted file types         | No       | `image/*,text/*`         |
| `LOG_LEVEL`          | Logging verbosity            | No       | `info`                   |

### Frontend Environment Variables

| Variable               | Description          | Required | Example                    |
| ---------------------- | -------------------- | -------- | -------------------------- |
| `NEXT_PUBLIC_API_URL`  | Backend API endpoint | Yes      | Your Railway URL           |
| `NEXT_PUBLIC_WS_URL`   | WebSocket endpoint   | Yes      | Your Railway WebSocket URL |
| `NEXT_PUBLIC_APP_NAME` | Application name     | No       | `Steel Chat`               |

## Database Setup

### Automatic Setup (Railway)

Railway automatically handles:

- PostgreSQL database provisioning
- Connection string generation
- Database initialization
- Prisma schema application

### Manual Database Setup

If using alternative platforms:

1. Create PostgreSQL database instance
2. Update `DATABASE_URL` environment variable
3. Run database migrations:
   ```bash
   npx prisma db push
   ```

## Testing & Verification

### Backend Health Check

Test your backend deployment:

```bash
curl https://your-backend-url.railway.app/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Server is running"
}
```

### Frontend Verification

1. Visit your Vercel deployment URL
2. Test user registration and login
3. Verify real-time chat functionality
4. Test file upload features (if enabled)

### WebSocket Connection Test

Verify WebSocket connectivity:

```javascript
const socket = new WebSocket("wss://your-backend-url.railway.app");
socket.onopen = () => console.log("Connected");
socket.onerror = (error) => console.error("Connection failed:", error);
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors

**Symptoms**: Frontend can't connect to backend
**Solution**: Ensure `CORS_ORIGIN` matches your frontend URL exactly

#### 2. Database Connection Failures

**Symptoms**: Backend fails to start or database operations fail
**Solution**:

- Verify `DATABASE_URL` is correct
- Check Railway database status
- Ensure Prisma migrations have run

#### 3. WebSocket Connection Issues

**Symptoms**: Real-time features not working
**Solution**:

- Verify `NEXT_PUBLIC_WS_URL` uses `wss://` protocol
- Check Railway WebSocket configuration
- Ensure backend is accessible

#### 4. JWT Authentication Errors

**Symptoms**: Login/registration failures
**Solution**:

- Generate a new secure `JWT_SECRET`
- Ensure `JWT_SECRET` is properly set in environment variables

### Platform-Specific Issues

#### Railway

- Check deployment logs in Railway dashboard
- Verify environment variables are set correctly
- Ensure database and Redis are provisioned
- Monitor resource usage

#### Vercel

- Review build logs for compilation errors
- Verify environment variables are configured
- Check function logs for API route issues
- Monitor deployment status

## Security Considerations

### Essential Security Measures

- [ ] Use strong, unique JWT secrets
- [ ] Enable HTTPS (automatic with Railway/Vercel)
- [ ] Configure proper CORS origins
- [ ] Store secrets in environment variables
- [ ] Enable rate limiting (already configured)
- [ ] Use security headers (helmet.js configured)

### Additional Security Recommendations

1. **Regular Security Updates**

   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

2. **Access Control**

   - Implement proper user authentication
   - Use role-based access control
   - Validate all user inputs

3. **Data Protection**
   - Encrypt sensitive data at rest
   - Use secure file upload validation
   - Implement proper error handling

## Performance Optimization

### Backend Optimization

1. **Database Performance**

   - Monitor query performance
   - Add database indexes as needed
   - Use connection pooling

2. **Caching Strategy**

   - Implement Redis caching
   - Cache frequently accessed data
   - Use appropriate cache invalidation

3. **Resource Monitoring**
   - Monitor CPU and memory usage
   - Track response times
   - Set up alerting for performance issues

### Frontend Optimization

1. **Vercel Analytics**

   - Enable Vercel Analytics for performance monitoring
   - Track Core Web Vitals
   - Monitor user experience metrics

2. **Code Splitting**

   - Implement dynamic imports
   - Optimize bundle sizes
   - Use Next.js optimization features

3. **CDN Configuration**
   - Leverage Vercel's global CDN
   - Optimize static asset delivery
   - Configure caching headers

## Support & Maintenance

### Monitoring

- Set up application monitoring
- Configure error tracking
- Monitor database performance
- Track user engagement metrics

### Backup Strategy

- Regular database backups
- Version control for codebase
- Environment variable backups
- Disaster recovery plan

### Update Procedures

1. **Code Updates**

   - Test changes in staging environment
   - Use feature flags for gradual rollouts
   - Monitor deployment health

2. **Database Migrations**

   - Test migrations on staging data
   - Backup before production migrations
   - Use Prisma migration tools

3. **Environment Updates**
   - Update dependencies regularly
   - Test compatibility with new versions
   - Maintain security patches

---

## Quick Reference

### Deployment Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Database and Redis provisioned
- [ ] JWT secret generated and set
- [ ] CORS origins configured
- [ ] File storage configured (if needed)
- [ ] Health checks passing
- [ ] Real-time features tested
- [ ] Security measures implemented

### Useful Commands

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Test backend health
curl https://your-backend-url.railway.app/api/health

# View Prisma database
npx prisma studio

# Check deployment logs (Railway)
# Use Railway dashboard

# Check build logs (Vercel)
# Use Vercel dashboard
```

### Support Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

_This deployment guide covers the essential steps for deploying Steel Chat to production. For additional support or questions, refer to the troubleshooting section or contact the development team._
