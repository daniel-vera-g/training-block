# Deployment Guide

## GitHub Pages Hosting

This application is deployed using GitHub Pages. Understanding how GitHub Pages works is important for configuring the correct base path.

### How GitHub Pages URLs Work

GitHub Pages serves repositories at specific URL patterns:

1. **User/Organization Site** (`<username>.github.io` repository):
   - Served at: `https://<username>.github.io/`
   - Or with custom domain: `https://yourdomain.com/`

2. **Project Sites** (any other repository):
   - Served at: `https://<username>.github.io/<repository-name>/`
   - Or with custom domain: `https://yourdomain.com/<repository-name>/`

### Important: Repository Name = URL Path

**The repository name determines the URL path where your site will be hosted.**

For example:
- Repository named `training-block` → hosted at `danielvg.me/training-block/`
- Repository named `runs` → hosted at `danielvg.me/runs/`
- Repository named `my-app` → hosted at `danielvg.me/my-app/`

### Current Configuration

This application is configured with:
- **Vite Base Path**: `/runs/` (configured in `vite.config.ts`)
- **Required Repository Name**: `runs`

**Therefore, the repository must be named `runs` for the deployment to work correctly at `danielvg.me/runs`.**

### How to Rename the Repository

If you need to rename the repository from `training-block` to `runs`:

1. Go to the repository on GitHub
2. Click **Settings**
3. In the **Repository name** field, change `training-block` to `runs`
4. Click **Rename**
5. Update your local git remote:
   ```bash
   git remote set-url origin https://github.com/daniel-vera-g/runs.git
   ```

### Deployment Workflow

The deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`):

1. **Trigger**: Pushes to the `main` branch
2. **Build**: Runs `npm ci` and `npm run build`
3. **Deploy**: Pushes the `dist` folder to the `gh-pages` branch
4. **Serve**: GitHub Pages serves the content from the `gh-pages` branch

### Changing the Base Path

If you want to host the app at a different path in the future:

1. Update the `base` in `vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: '/your-new-path/',
     // ...
   })
   ```

2. Rename the repository to match the new path name (e.g., repository name should be `your-new-path`)

3. Rebuild and deploy:
   ```bash
   npm run build
   git push origin main
   ```

### Custom Domain Setup

If you're using a custom domain (like `danielvg.me`):

1. The domain should be configured in your main GitHub Pages repository
2. Add a `CNAME` file to the `gh-pages` branch if needed (the deploy action handles this automatically)
3. Ensure DNS records point to GitHub Pages servers

### Troubleshooting

**404 Errors after deployment:**
- Verify the repository name matches the base path in `vite.config.ts`
- Check that GitHub Pages is enabled and serving from the `gh-pages` branch
- Ensure the build completed successfully in GitHub Actions

**Assets not loading (blank page):**
- This usually means the base path is misconfigured
- The `base` in `vite.config.ts` must match the repository name
- Check browser console for 404 errors on asset files
