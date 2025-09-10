# Render.com Auto-Deployment Configuration Guide

This document explains how to configure GitHub Actions for automatic deployment to Render.com.

## Overview

This workflow supports the following features:
- Automatic deployment trigger when code is pushed to `main` or `deploy` branches
- Manual deployment trigger support
- Secure management of sensitive information using GitHub Secrets
- Support for two deployment methods: Deploy Hook (recommended) and Render API

## Prerequisites

1. **Render.com Account**: You need a Render.com account
2. **Render Service**: A Web Service or Static Site created on Render
3. **GitHub Repository**: Administrator permissions on the GitHub repository

## Configuration Steps

### 1. Set up Service on Render.com

#### Method 1: Using Deploy Hook (Recommended)

1. Log in to [Render.com](https://render.com)
2. Go to your service (Web Service or Static Site)
3. Find "Deploy Hook" in service settings
4. Copy the Deploy Hook URL (similar to: `https://api.render.com/deploy/srv-xxxxxxxxx?key=yyyyyyyyy`)

#### Method 2: Using Render API

1. Log in to [Render.com](https://render.com)
2. Go to [Account Settings](https://dashboard.render.com/account) > API Keys
3. Create a new API Key and copy it
4. Note your service ID (found in service URL, format like `srv-xxxxxxxxx`)

### 2. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Environments**
3. Create an environment named `RenderConfig` (if it doesn't exist)
4. Add the following secrets in the `RenderConfig` environment:

#### Method 1 secrets (using Deploy Hook):
```
RENDER_DEPLOY_HOOK_URL: Your Deploy Hook URL
```

#### Method 2 secrets (using Render API):
```
RENDER_API_KEY: Your Render API Key
RENDER_SERVICE_ID: Your service ID (e.g., srv-xxxxxxxxx)
```

**Note**: You only need to configure one method. Deploy Hook method is simpler and recommended.

### 3. Trigger Deployment

Deployment will be automatically triggered in the following cases:
- Push code to `main` branch
- Push code to `deploy` branch
- Manually trigger workflow in GitHub Actions

## Render Service Configuration Recommendations

### For Web Service (Node.js Application)

Set in Render service configuration:

```yaml
# Build Command
Build Command: npm ci && npm run build

# Start Command  
Start Command: npm start

# Environment Variables
NODE_ENV: production
PORT: 10000  # Render automatically sets PORT environment variable
```

### For Static Site

Set in Render service configuration:

```yaml
# Build Command
Build Command: npm ci && npm run build

# Publish Directory
Publish Directory: build  # or dist, depending on your build output directory
```

## Workflow Details

### Trigger Conditions
- `push` to `main` or `deploy` branches
- `workflow_dispatch` (manual trigger)

### Execution Steps
1. **Checkout Code**: Get the latest code
2. **Setup Node.js**: Install Node.js 20.x version
3. **Install Dependencies**: Execute `npm ci` to install project dependencies
4. **Build Application**: Execute `npm run build` to build production version
5. **Deploy to Render**: Trigger Render deployment based on configured method
6. **Status Notification**: Output deployment results and related information

### Security Measures
- All sensitive information stored in GitHub Secrets
- Use dedicated environment (`RenderConfig`) for configuration isolation
- API keys are not displayed in logs

## Troubleshooting

### Common Issues and Solutions

#### 1. Deployment Failed: 401 Unauthorized
**Cause**: Invalid API Key or Deploy Hook URL
**Solution**:
- Check configuration in GitHub Secrets is correct
- Regenerate Render API Key or Deploy Hook
- Ensure secret names match exactly

#### 2. Deployment Failed: 404 Not Found
**Cause**: Incorrect Service ID or service doesn't exist
**Solution**:
- Verify `RENDER_SERVICE_ID` is correct
- Ensure service exists and is accessible on Render

#### 3. Build Failed
**Cause**: Dependency installation or build process error
**Solution**:
- Check dependencies and scripts in `package.json`
- Ensure local build succeeds
- Check Node.js version compatibility

#### 4. Environment Variable Issues
**Cause**: Render service missing required environment variables
**Solution**:
- Add required environment variables in Render service settings
- Ensure `NODE_ENV=production`

### Debugging Steps

1. **Check GitHub Actions Logs**: View detailed error information
2. **Verify Render Service Status**: Ensure Render service is running normally
3. **Test Local Build**: Test build process in local environment
4. **Check Secrets Configuration**: Ensure all required secrets are configured correctly

## Advanced Configuration

### Custom Branch Triggers

To modify trigger branches, edit `.github/workflows/render-deploy.yml`:

```yaml
on:
  push:
    branches: [ main, develop, staging ]  # Add or modify branch names
```

### Add Build Optimization

Add caching and parallel processing to workflow:

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Environment-Specific Deployment

Configure different Render services for different environments:

```yaml
- name: Deploy to Staging
  if: github.ref == 'refs/heads/develop'
  env:
    RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_STAGING_DEPLOY_HOOK_URL }}

- name: Deploy to Production  
  if: github.ref == 'refs/heads/main'
  env:
    RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_PROD_DEPLOY_HOOK_URL }}
```

## Monitoring and Notifications

### Deployment Status Monitoring

1. **GitHub Actions**: View workflow status in Actions tab
2. **Render Dashboard**: View deployment progress in Render console
3. **Deployment Logs**: View detailed build and deployment logs

### Setup Notifications (Optional)

Add Slack, Discord, or email notifications:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Best Practices

1. **Use Deploy Hook**: Simpler and more reliable than API method
2. **Environment Isolation**: Use different Render services for different environments
3. **Key Rotation**: Regularly update API keys and Deploy Hooks
4. **Monitor Logs**: Regularly check deployment logs to identify potential issues
5. **Test Branch**: Use `deploy` branch for deployment testing
6. **Rollback Plan**: Know how to rollback to previous version on Render

## Related Links

- [Render.com Documentation](https://render.com/docs)
- [Render API Documentation](https://api-docs.render.com)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Support

For issues, please check:
1. GitHub Actions execution logs
2. Render service deployment logs
3. Troubleshooting section in this document

---

*Last updated: December 2024*