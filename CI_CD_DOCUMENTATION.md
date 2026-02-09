# CI/CD Pipeline Documentation

## Overview

This document provides comprehensive documentation for the GitHub Actions CI/CD pipeline used in the Freelance AI Agents Marketplace project.

## Table of Contents

- [Pipeline Architecture](#pipeline-architecture)
- [Workflows](#workflows)
- [Reusable Workflows](#reusable-workflows)
- [Deployment Guide](#deployment-guide)
- [Secrets Management](#secrets-management)
- [Troubleshooting](#troubleshooting)

---

## Pipeline Architecture

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Push to Main/Pull Request                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │      Fast Lint Workflow      │
        │  (Runs on EVERY push/PR)     │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │       Main CI Pipeline       │
        │  - Backend Tests             │
        │  - Frontend Tests            │
        │  - Security Scans            │
        │  - Quality Gates             │
        └──────────────┬───────────────┘
                       │
          ┌────────────┴──────────────┐
          │   Push to main branch     │
          └────────────┬──────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │       CD Pipeline            │
        │  - Pre-deploy Checks         │
        │  - Semantic Release          │
        │  - Build Docker Images       │
        │  - Deploy to Staging         │
        │  - Health Checks             │
        │  - Deploy to Production      │
        │  (Manual Approval)           │
        └──────────────────────────────┘
```

---

## Workflows

### 1. Fast Lint Workflow (`lint.yml`)

**Trigger:** Every push and pull request

**Purpose:** Super-fast linting to quickly catch code quality issues

**Jobs:**

| Job | Description |
|-----|-------------|
| `backend-lint` | Runs ESLint on backend code |
| `backend-format` | Checks Prettier formatting for backend |
| `frontend-lint` | Runs ESLint on frontend code |
| `frontend-typescript` | TypeScript type checking |
| `frontend-format` | Checks Prettier formatting for frontend |
| `lint-summary` | Generates summary report |
| `status-check` | Required for PR merging |

**Caching:**
- ESLint cache
- TypeScript cache
- Node modules

**Quality Gate:** Blocks PR merge if any job fails

### 2. Main CI Pipeline (`ci.yml`)

**Trigger:** Push to `main`/`develop` branches, Pull Requests

**Purpose:** Comprehensive testing and security scanning

**Matrix Testing:**
- Node.js versions: 18.x, 20.x

**Jobs:**

#### Backend Jobs
- `backend-lint` - ESLint checks
- `backend-tests` - Unit tests with coverage (PostgreSQL service)

#### Frontend Jobs
- `frontend-lint` - ESLint + TypeScript check
- `frontend-build` - Production build verification

#### Security Jobs
- `security-audit` - npm audit
- `snyk-security` - Snyk vulnerability scan
- `dependency-check` - OWASP dependency check

#### Quality Gates
- `quality-gate` - Ensures all critical jobs pass
- `summary` - Generates CI summary report

**Artifacts:**
- Coverage reports (backend)
- Build artifacts (frontend)
- Security scan reports

### 3. CD Pipeline (`cd.yml`)

**Trigger:** Push to `main` branch only

**Purpose:** Build, test, and deploy to staging/production

**Environments:**
- `staging` - Automatic deployment
- `production` - Manual approval required

**Jobs:**

#### Pre-Deployment
- `pre-deploy-checks` - Quick tests before deployment
- `semantic-release` - Automatic versioning and changelog

#### Build & Push
- `build-and-push` - Build Docker images and push to registries
  - GitHub Container Registry (GHCR)
  - Docker Hub

#### Deployments
- `deploy-staging` - Deploy to staging environment
- `deploy-production` - Deploy to production (manual approval)

#### Health & Monitory
- `rollback-production` - Automatic rollback on failure

**Notifications:**
- Slack webhooks
- Discord webhooks

**Docker Images:**
- `ghcr.io/sndrkrshnn/freelance-marketplace-backend`
- `ghcr.io/sndrkrshnn/freelance-marketplace-frontend`
- `sndrkrshnn/freelance-marketplace-backend` (Docker Hub)
- `sndrkrshnn/freelance-marketplace-frontend` (Docker Hub)

---

## Reusable Workflows

### Reusable Backend Tests (`reusable/backend-tests.yml`)

**Inputs:**
- `working-directory` - Path to backend code
- `node-version` - Node.js version (default: 18)
- `run-coverage` - Generate coverage reports (default: true)
- `upload-coverage` - Upload to Codecov (default: true)

**Secrets:**
- `CODECOV_TOKEN` - Codecov authentication token
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT secret key
- `STRIPE_SECRET_KEY` - Stripe API key

**Services:**
- PostgreSQL 15 container

**Outputs:**
- `test-result` - Test execution result
- `coverage-percentage` - Code coverage percentage

### Reusable Frontend Tests (`reusable/frontend-tests.yml`)

**Inputs:**
- `working-directory` - Path to frontend code
- `node-version` - Node.js version (default: 18)
- `run-type-check` - Run TypeScript check (default: true)
- `run-build` - Build project (default: true)
- `run-tests` - Run tests (default: true)
- `upload-artifact` - Upload build artifacts (default: true)

**Secrets:**
- `VITE_API_URL` - API endpoint URL
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key

**Outputs:**
- `lint-result` - Lint result
- `type-check-result` - TypeScript check result
- `build-result` - Build result

### Reusable Docker Build (`reusable/docker-build.yml`)

**Inputs:**
- `docker-context` - Docker build context path
- `dockerfile` - Dockerfile name (default: Dockerfile)
- `image-name` - Full image name with registry
- `image-tags` - Comma-separated tags
- `push` - Push to registry (default: true)
- `cache-from` - Cache sources
- `cache-to` - Cache destination
- `registry` - Docker registry (default: ghcr.io)
- `build-args` - JSON object of build arguments
- `platforms` - Target platforms for multi-arch build
- `target` - Build target stage

**Secrets:**
- `registry-username` - Registry username
- `registry-password` - Registry password/token

**Outputs:**
- `image-digest` - Docker image digest
- `image-ref` - Image reference
- `build-time` - Build timestamp

**Features:**
- Multi-platform builds
- SBOM generation
- Trivy security scanning
- Build caching

### Reusable Deploy (`reusable/deploy.yml`)

**Inputs:**
- `environment` - Deployment environment (staging/production)
- `cluster-name` - Kubernetes cluster name
- `namespace` - Kubernetes namespace
- `backend-image` - Backend image reference
- `backend-tag` - Backend image tag
- `frontend-image` - Frontend image reference
- `frontend-tag` - Frontend image tag
- `manifests-path` - Path to Kubernetes manifests
- `run-health-check` - Run health checks (default: true)
- `health-check-retries` - Health check retry count (default: 30)
- `health-check-interval` - Interval between checks (default: 10s)
- `wait-timeout` - Wait timeout for rollout (default: 300s)

**Secrets:**
- `kubeconfig` - Kubernetes configuration (base64 encoded)
- `slack-webhook` - Slack webhook URL
- `discord-webhook` - Discord webhook URL
- `api-key` - API key for additional services

**Outputs:**
- `backend-health` - Backend health status
- `frontend-health` - Frontend health status
- `deploy-time` - Deployment timestamp

**Features:**
- Kubernetes deployment
- Health checks with retries
- Automatic rollback on failure
- Notification support

---

## Deployment Guide

### Prerequisites

1. **GitHub Secrets** configured (see [Secrets Management](#secrets-management))
2. **Docker Hub** account and access token
3. **Kubernetes cluster** access with kubeconfig
4. **Slack/Discord** webhooks (optional)
5. **Codecov** account (optional, for coverage reports)
6. **Snyk** account (optional, for security scanning)

### Manual Deployment

#### Deploy to Staging

```bash
# Using the deploy script
./scripts/deploy.sh staging 1.0.0

# Or via GitHub Actions workflow dispatch
# Go to Actions > CD Pipeline > Run workflow
```

#### Deploy to Production

```bash
# Using the deploy script
./scripts/deploy.sh production 1.0.0

# Or via GitHub Actions (requires manual approval)
# Go to Actions > CD Pipeline > Run workflow
# Then approve production deployment in the Actions tab
```

#### Health Check

```bash
./scripts/deploy.sh staging health-check
./scripts/deploy.sh production health-check
```

#### Rollback

Automated rollback happens on production deployment failure. To manually rollback:

```bash
./scripts/deploy.sh production rollback
```

### Using Reusable Workflows in Your Projects

#### Example: Deploy Workflow

```yaml
name: My Deployment

on:
  push:
    branches: [main]

jobs:
  deploy-to-staging:
    uses: ./.github/workflows/reusable/deploy.yml
    with:
      environment: staging
      cluster-name: my-cluster
      namespace: my-app-staging
      backend-image: ghcr.io/myorg/my-backend
      backend-tag: ${{ github.sha }}
      run-health-check: true
    secrets:
      kubeconfig: ${{ secrets.KUBE_CONFIG }}
      slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

### Environment Variables

#### Backend Variables

See `.env.example`, `.env.staging`, `.env.production` for details. Required variables:

- `NODE_APP_SECRET` - Application secret key
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API key

#### Frontend Variables

All frontend variables must start with `VITE_`. Required:

- `VITE_API_URL` - Backend API URL
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key

---

## Secrets Management

### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

#### Authentication & Registries
| Secret | Description | Example |
|--------|-------------|---------|
| `GH_TOKEN` | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `DOCKER_HUB_USERNAME` | Docker Hub username | `sndrkrshnn` |
| `DOCKER_HUB_TOKEN` | Docker Hub access token | `dckr_xxxxxxxxxxxx` |

#### Code Coverage & Security
| Secret | Description |
|--------|-------------|
| `CODECOV_TOKEN` | Codecov upload token |
| `SNYK_TOKEN` | Snyk API token |
| `SNYK_ORG` | Snyk organization name |

#### Notifications
| Secret | Description |
|--------|-------------|
| `SLACK_WEBHOOK` | Slack incoming webhook URL |
| `DISCORD_WEBHOOK` | Discord webhook URL |

#### Kubernetes
| Secret | Description |
|--------|-------------|
| `KUBE_CONFIG_STAGING` | Base64 encoded kubeconfig for staging |
| `KUBE_CONFIG_PRODUCTION` | Base64 encoded kubeconfig for production |

#### Application Secrets
| Secret | Description |
|--------|-------------|
| `STAGING_DB_PASSWORD` | Staging database password |
| `STAGING_JWT_SECRET` | Staging JWT secret |
| `STAGING_STRIPE_SECRET_KEY` | Staging Stripe secret key |
| `PROD_DB_PASSWORD` | Production database password |
| `PROD_JWT_SECRET` | Production JWT secret |
| `PROD_STRIPE_SECRET_KEY` | Production Stripe secret key |

### Setting up Secrets

#### Via GitHub UI
1. Go to repository Settings
2. Click on "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Add name and value
5. Click "Add secret"

#### Via GitHub CLI
```bash
gh secret set GH_TOKEN
gh secret set CODECOV_TOKEN
gh secret set SLACK_WEBHOOK
gh secret set KUBE_CONFIG_PRODUCTION < kubeconfig.base64
```

#### Encoding kubeconfig
```bash
cat ~/.kube/config | base64 -w 0 > kubeconfig.base64
```

---

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem:** Docker build fails with "no space left on device"

**Solution:**
```yaml
# Add to build action
- name: Free disk space
  run: |
    sudo rm -rf /usr/share/dotnet
    sudo rm -rf /opt/ghc
    sudo rm -rf "/usr/local/share/boost"
    sudo rm -rf "$AGENT_TOOLSDIRECTORY"
    df -h
```

#### 2. Timeouts

**Problem:** Deployment health checks timeout

**Solution:**
```yaml
# Increase health check timeout in reusable/deploy.yml
health-check-retries: 60  # increase from 30
health-check-interval: 15 # increase from 10
```

#### 3. Permission Issues

**Problem:** Failed to push to Docker registry

**Solution:**
- Verify `GH_TOKEN` or `DOCKER_HUB_TOKEN` has `write:packages` permission
- Check registry access permissions

#### 4. Database Connection Failures

**Problem:** Tests fail with database connection error

**Solution:**
```yaml
# Ensure service health check is configured
postgres:
  options: >-
    --health-cmd pg_isready
    --health-interval 10s
    --health-timeout 5s
    --health-retries 5
```

#### 5. Coverage Upload Failures

**Problem:** Codecov upload fails

**Solution:**
1. Verify `CODECOV_TOKEN` is set correctly
2. Check coverage file path
3. Use `continue-on-error: true` to not block pipeline

### Debug Mode

To enable debug logging, add this secret:
- `ACTIONS_STEP_DEBUG: true`
- `ACTIONS_RUNNER_DEBUG: true`

### Viewing Logs

#### Via GitHub UI
1. Go to Actions tab
2. Click on the workflow run
3. Expand job steps to view logs

#### Via GitHub CLI
```bash
gh run view [run-id] --log
gh run list
gh run watch [run-id]
```

### Re-running Failed Workflows

```bash
# Re-run all jobs
gh run rerun [run-id]

# Re-run failed jobs only
gh run rerun [run-id] --failed
```

### Manual Approval Not Working

**Problem:** Production deploy waiting for approval but no button appears

**Solution:**
1. Check environment protection rules
2. Ensure required reviewers have write access
3. Verify GitHub Actions permissions are enabled

---

## Best Practices

### 1. Use Matrix Testing
Test across multiple Node.js versions to ensure compatibility

### 2. Cache Dependencies
Cache `node_modules` and build artifacts for faster runs

### 3. Parallel Jobs
Run independent jobs in parallel to reduce pipeline time

### 4. Quality Gates
Block merges if critical jobs or quality gates fail

### 5. Semantic Versioning
Use semantic-release for automatic version management

### 6. Security First
Always run security scans before deployment

### 7. Health Checks
Implement proper health checks for all deployments

### 8. Rollback Strategy
Always have rollback capability in production

### 9. Notifications
Configure Slack/Discord notifications for important events

### 10. Documentation
Keep this documentation updated with any pipeline changes

---

## Monitoring & Metrics

### Pipeline Performance

View pipeline metrics at:
- GitHub Actions: Repository > Actions > Workflow runs
- Codecov: https://codecov.io/gh/sndrkrshnn/freelance-agents-marketplace
- Snyk: https://snyk.io/org/[org-name]/project/[project-id]

### Key Metrics to Track

- Pipeline duration
- Build cache hit rate
- Test pass rate
- Code coverage trend
- Security vulnerabilities count
- Deployment success rate
- Mean time to recovery (MTTR)

---

## Contributing

When adding new features that require pipeline changes:

1. Update this documentation
2. Test workflows in a fork first
3. Use environment variables for all secrets
4. Add appropriate notifications
5. Consider rollback scenarios

---

## Support

For issues or questions regarding the CI/CD pipeline:

1. Check this documentation first
2. Review GitHub Actions logs
3. Check workflow files in `.github/workflows/`
4. Open an issue on the repository

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Semantic Release](https://github.com/semantic-release/semantic-release)
- [Codecov Documentation](https://docs.codecov.com/)

---

**Last Updated:** 2026-02-09
