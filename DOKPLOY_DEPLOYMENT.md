# Dokploy Deployment Guide for Rastar Chat (LibreChat)

## Prerequisites
- Dokploy instance running on your server
- Domain name pointed to your server (e.g., chat.rastar.dev)
- Git repository access (GitHub)

## Step 1: Prepare Your Repository

### 1.1 Update Production Environment Variables
Create a `.env.prod` file or configure in Dokploy dashboard:

```bash
# Application Settings
APP_TITLE=Rastar Chat
NODE_ENV=production
HOST=0.0.0.0
PORT=3080
DOMAIN_CLIENT=https://chat.rastar.dev
DOMAIN_SERVER=https://chat.rastar.dev

# Security (Generate new secrets for production!)
JWT_SECRET=your_production_jwt_secret_change_this
JWT_REFRESH_SECRET=your_production_jwt_refresh_secret_change_this
CREDS_KEY=your_production_creds_key_32_characters
CREDS_IV=your_production_creds_iv_16_characters
SESSION_EXPIRY=1000*60*60*24*7

# MongoDB
MONGO_URI=mongodb://mongodb:27017/LibreChat

# Redis (REQUIRED for production)
USE_REDIS=true
REDIS_URI=redis://redis:6379
REDIS_PASSWORD=your_secure_redis_password

# MeiliSearch
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=your_production_meili_key
MEILI_NO_ANALYTICS=true

# PostgreSQL (Vector DB)
POSTGRES_DB=rastardb
POSTGRES_USER=rastaruser
POSTGRES_PASSWORD=your_secure_postgres_password

# RAG API
RAG_API_URL=http://rag_api:8000
RAG_PORT=8000

# OpenRouter API
OPENROUTER_KEY=your_openrouter_api_key
ENDPOINTS=custom

# Planka Integration
PLANKA_INTEGRATION_ENABLED=true
PLANKA_BASE_URL=https://pm-dev.rastar.dev
PLANKA_STORE_TOKENS=true
PLANKA_MCP_ENABLED=false

# User Registration
ALLOW_REGISTRATION=true
ALLOW_SOCIAL_LOGIN=false
ALLOW_EMAIL_LOGIN=true

# File Upload
FILE_UPLOAD_PATH=/app/uploads
```

### 1.2 Generate Secure Secrets

Run these commands locally to generate secure keys:

```bash
# For JWT secrets (32+ characters)
openssl rand -base64 32

# For CREDS_KEY (must be exactly 32 characters)
openssl rand -base64 24

# For CREDS_IV (must be exactly 16 characters)
openssl rand -base64 12

# For Redis and MeiliSearch passwords
openssl rand -base64 24
```

## Step 2: Deploy on Dokploy

### 2.1 Create New Application

1. Log in to your Dokploy dashboard
2. Click **"Create Application"**
3. Select **"Docker Compose"** as deployment type

### 2.2 Configure Repository

1. **Repository URL**: Your GitHub repo (https://github.com/yourusername/LibreChat)
2. **Branch**: `main` or your production branch
3. **Docker Compose File**: Select `docker-compose.prod.yml`
4. **Build Context**: Root directory (`/`)

### 2.3 Set Environment Variables

In Dokploy dashboard, add all the environment variables from `.env.prod`:

**Critical Variables:**
- `NODE_ENV=production`
- `DOMAIN_CLIENT` and `DOMAIN_SERVER` with your domain
- All JWT and encryption secrets
- `USE_REDIS=true`
- Database credentials
- API keys

### 2.4 Configure Domain & SSL

1. **Domain Settings**:
   - Primary domain: `chat.rastar.dev`
   - Enable automatic SSL/HTTPS (Dokploy handles Let's Encrypt)
   - Port mapping: 80 (HTTP) and 443 (HTTPS)

2. **SSL Configuration**:
   - Dokploy will automatically provision SSL certificates
   - Ensure your domain's DNS A record points to your server IP
   - Wait 2-5 minutes for certificate provisioning

### 2.5 Deploy

1. Click **"Deploy"** button
2. Monitor deployment logs for any errors
3. Wait for all services to start (usually 2-5 minutes)

## Step 3: Post-Deployment Verification

### 3.1 Check Service Health

```bash
# SSH into your server
ssh your-server

# Check running containers
docker ps

# Expected containers:
# - librechat-api
# - librechat-nginx
# - librechat-mongodb
# - librechat-redis
# - librechat-meilisearch
# - librechat-vectordb
# - librechat-rag-api
```

### 3.2 Test Application

1. **Access your domain**: https://chat.rastar.dev
2. **Create a test account**: Register new user
3. **Test AI chat**: Send a message using GPT-4o-mini
4. **Test Planka login**: Use the Planka login option
5. **Check Redis caching**: Response should be faster on repeat queries

### 3.3 Verify Planka Integration

1. Go to Settings → Account
2. Click "Connect to Planka"
3. Login with your Planka credentials
4. Verify user data displays correctly

## Step 4: Configure Reverse Proxy (If Needed)

If Dokploy doesn't handle SSL automatically:

### 4.1 Update nginx.conf

```nginx
server {
    listen 80;
    server_name chat.rastar.dev;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.rastar.dev;

    ssl_certificate /etc/letsencrypt/live/chat.rastar.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.rastar.dev/privkey.pem;

    location / {
        proxy_pass http://api:3080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 5: Maintenance Commands

### View Logs
```bash
# API logs
docker logs librechat-api -f

# All services
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Services
```bash
# Via Dokploy dashboard: Click "Restart" button

# Or via SSH:
docker-compose -f docker-compose.prod.yml restart
```

### Update Application
```bash
# Via Dokploy: Click "Redeploy" button

# Or pull latest changes:
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
# MongoDB backup
docker exec librechat-mongodb mongodump --out /backup

# Copy backup to host
docker cp librechat-mongodb:/backup ./mongodb-backup-$(date +%Y%m%d)
```

## Troubleshooting

### Issue: Services won't start
**Solution**: Check logs: `docker logs librechat-api` and verify all environment variables are set

### Issue: Can't connect to database
**Solution**: Verify MongoDB container is running: `docker ps | grep mongodb`

### Issue: SSL certificate not provisioning
**Solution**: 
1. Verify DNS A record points to server IP: `dig chat.rastar.dev`
2. Wait 5 minutes for propagation
3. Check Dokploy SSL logs

### Issue: Planka login not working
**Solution**: 
1. Verify `PLANKA_BASE_URL` is correct
2. Check `CREDS_KEY` and `CREDS_IV` are properly set
3. Test Planka API directly: `curl https://pm-dev.rastar.dev/api/users/me`

### Issue: Slow performance
**Solution**: 
1. Verify Redis is running: `docker ps | grep redis`
2. Check Redis connection: `docker exec librechat-redis redis-cli ping`
3. Monitor resource usage: `docker stats`

## Security Checklist

- [ ] Changed all default passwords and secrets
- [ ] Enabled SSL/HTTPS
- [ ] Set strong JWT secrets
- [ ] Configured Redis password
- [ ] Limited MongoDB to internal network (no external ports)
- [ ] Set up regular backups
- [ ] Configured firewall rules
- [ ] Enabled rate limiting (if needed)
- [ ] Reviewed ALLOW_REGISTRATION setting
- [ ] Set up monitoring/alerts

## Next Steps: MCP Integration

After successful deployment, enable Model Context Protocol:

1. Set `PLANKA_MCP_ENABLED=true` in environment variables
2. Restart application
3. Test MCP functionality with stored Planka tokens
4. Configure MCP servers in LibreChat settings

## Support

- LibreChat Documentation: https://www.librechat.ai/docs
- Dokploy Documentation: https://dokploy.com/docs
- GitHub Issues: Your repository issues page

---

**Production Deployment Checklist:**
- [ ] Generated and configured secure secrets
- [ ] Set production environment variables in Dokploy
- [ ] Configured domain DNS (A record)
- [ ] Deployed application via Dokploy
- [ ] Verified SSL certificate provisioned
- [ ] Tested application access via HTTPS
- [ ] Created test user account
- [ ] Tested AI chat functionality
- [ ] Tested Planka integration
- [ ] Set up database backups
- [ ] Configured monitoring
