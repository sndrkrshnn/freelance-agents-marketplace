# CI/CD Quick Start Guide

This guide will help you set up the CI/CD pipeline for the Freelance AI Agents Marketplace project.

## 📋 Prerequisites

Before setting up the CI/CD pipeline, ensure you have:

- ✅ GitHub account with write access to the repository
- ✅ GitHub Personal Access Token (PAT) with `repo` and `workflow` scopes
- ✅ Docker Hub account (recommended, or use GitHub Container Registry)
- ✅ Kubernetes cluster access (for deployments)
- ✅ Slack workspace (optional, for notifications)
- ✅ Codecov account (optional, for coverage reports)

## 🚀 Quick Setup (5 minutes)

### Step 1: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/your-username/freelance-agents-marketplace.git
cd freelance-agents-marketplace

# Verify workflows exist
ls -la .github/workflows/
```

You should see:
- `ci.yml` - Main CI pipeline
- `cd.yml` - CD pipeline
- `lint.yml` - Fast lint workflow
- `reusable/` - Reusable workflows

### Step 2: Set Required GitHub Secrets

Create the following secrets in your repository:

#### Essential Secrets

```bash
# Via GitHub CLI (recommended)
gh secret set GH_TOKEN
gh secret set DOCKER_HUB_USERNAME
gh secret set DOCKER_HUB_TOKEN
```

**Or via GitHub UI:**
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:

| Secret | Value |
|--------|-------|
| `GH_TOKEN` | Your GitHub PAT with `repo` and `workflow` scopes |
| `DOCKER_HUB_USERNAME` | Your Docker Hub username |
| `DOCKER_HUB_TOKEN` | Docker Hub access token |

### Step 3: Configure Environments

1. Go to Settings → Environments
2. Create environments:
   - **staging** (no protection rules)
   - **production** (add protection rules for manual approval)

For production environment:
- Add required reviewers
- Enable "Wait timer" (optional, e.g., 30 minutes)
- Add any other required checks

### Step 4: Test the Pipeline

```bash
# Create a test branch
git checkout -b test-ci

# Make a small change
echo "# Test CI/CD" >> README.md

# Commit and push
git add .
git commit -m "test: verify CI/CD pipeline setup"
git push origin test-ci

# Create a Pull Request
gh pr create --title "Test CI/CD" --body "Testing pipeline setup"
```

Check the Actions tab to see:
- ✅ Fast lint workflow running
- ✅ Main CI pipeline running
- 📊 Coverage reports (if Codecov configured)
- 🔒 Security scans

### Step 5: Merge and Deploy

After the PR passes all checks:

```bash
# Merge to main
gh pr merge test-ci --merge

# Watch the CD pipeline run automatically
# - Should build Docker images
# - Deploy to staging automatically
# - Production deployment requires manual approval
```

## 📦 Optional Services Setup

### Codecov (Coverage Reports)

1. Sign up at https://codecov.io
2. Add your repository
3. Get the upload token
4. Add secret: `gh secret set CODECOV_TOKEN`

### Snyk (Security Scanning)

1. Sign up at https://snyk.io
2. Add your repository
3. Get the API token
4. Add secret: `gh secret set SNYK_TOKEN`
5. Set `gh secret set SNYK_ORG` (your Snyk organization name)

### Slack Notifications

1. Create Slack App at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create webhook URL
4. Add secret: `gh secret set SLACK_WEBHOOK`

### Discord Notifications

1. Create webhook in Discord server settings
2. Add secret: `gh secret set DISCORD_WEBHOOK`

### Kubernetes Deployment

If deploying to Kubernetes:

1. Base64 encode your kubeconfig:
```bash
cat ~/.kube/config | base64 -w 0 > kubeconfig.base64
```

2. Add secrets:
```bash
gh secret set KUBE_CONFIG_STAGING < kubeconfig-staging.base64
gh secret set KUBE_CONFIG_PRODUCTION < kubeconfig-production.base64
```

3. Create Kubernetes manifests (see `k8s/` directory)

## 🔧 Configuration Files

### Backend Environment

Copy and configure environment files:

```bash
# Development
cp backend/.env.example backend/.env

# Staging
cp backend/.env.staging.example backend/.env.staging
# Edit and set required secrets

# Production
cp backend/.env.production.example backend/.env.production
# Edit and set required secrets
```

### Frontend Environment

```bash
# Development
cp frontend/.env.example frontend/.env

# Staging
cp frontend/.env.staging.example frontend/.env.staging

# Production
cp frontend/.env.production.example frontend/.env.production
```

## 🎯 Common Workflows

### Run Lint Only

The lint workflow runs on every push/PR automatically. To trigger manually:

```bash
gh workflow run lint.yml
```

### Run CI Pipeline

```bash
# Manual trigger
gh workflow run ci.yml

# With specific branch
gh workflow run ci.yml -f branch=develop
```

### Trigger CD Deployment

```bash
# To staging (automatic on main branch push)
git push origin main

# To production (requires approval)
# Go to Actions → CD Pipeline → Run workflow
gh workflow run cd.yml -f environment=production -f skip_tests=true
```

## 🐳 Local Testing with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

Services available:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- pgAdmin: http://localhost:5050
- Redis Commander: http://localhost:8081

## 📊 Monitoring Your Pipeline

### GitHub Actions Dashboard

Visit: `https://github.com/your-username/freelance-agents-marketplace/actions`

Key metrics to track:
- ✅ Workflow success rate
- ⏱️ Pipeline duration
- 🐛 Test failures
- 🔒 Security vulnerabilities

### Coverage Reports

Visit: `https://codecov.io/gh/your-username/freelance-agents-marketplace`

### Security Reports

Visit: `https://snyk.io/org/your-org/project/your-project-id`

## 🔄 Workflow Triggers

| Workflow | Trigger | Notes |
|----------|---------|-------|
| Fast Lint | Every push/PR | Runs in ~1 minute |
| CI Pipeline | Push to main/develop, PR | Full test suite |
| CD Pipeline | Push to main | Auto-deploy to staging |
| CD - Production | Manual approval | Required reviewers |

## 🏆 Best Practices

1. **Commit Conventions** - Use semantic commits for auto-release:
   ```
   feat: add user authentication
   fix: correct database connection error
   chore: update dependencies
   ```

2. **Branch Strategy**:
   - `main` - Production-ready code
   - `develop` - Integration branch
   - `feature/*` - New features
   - `fix/*` - Bug fixes

3. **PR Guidelines**:
   - Always create a PR for changes
   - Ensure all CI checks pass
   - Include relevant tests
   - Update documentation

4. **Before Deployment**:
   - Run local tests: `npm test` (backend), `npm run type-check` (frontend)
   - Check logs for errors
   - Verify environment variables
   - Test on staging first

## 🐛 Troubleshooting

### Pipeline Fails on Push

```bash
# Check workflow details
gh run view --log

# Re-run failed jobs
gh run rerun [run-id]
```

### Docker Build Fails

Check:
- `GITHUB_TOKEN` has `write:packages` permission
- Docker Hub credentials are correct
- Dockerfile syntax is valid

### Tests Fail Locally But Pass in CI

Common causes:
- Environment differences
- Node version mismatch
- Missing environment variables

Solution:
```bash
# Pin Node.js version in package.json
"engines": {
  "node": ">=18.0.0"
}

# Use same Node version in CI
.github/workflows/ci.yml -> node-version: '18'
```

## 📚 Next Steps

1. **Read Full Documentation**: [CI_CD_DOCUMENTATION.md](./CI_CD_DOCUMENTATION.md)
2. **Configure All Secrets**: Add all optional services
3. **Set Up Monitoring**: Configure alerts for failed pipelines
4. **Customize Workflows**: Adjust for your specific needs
5. **Deploy to Production**: Follow deployment guide

## 🆘 Need Help?

- 📖 Full documentation: [CI_CD_DOCUMENTATION.md](./CI_CD_DOCUMENTATION.md)
- 🐛 Report issues: GitHub Issues
- 💬 Community discussions: GitHub Discussions

---

**Setup Complete! 🎉**

Your CI/CD pipeline is now ready. Every push will trigger automated testing, and merges to main will deploy to staging with automatic production promotion (with manual approval).
