# 🚀 ChatPilot B2B — Dokploy Deployment Guide

## Overview

This guide deploys two Docker containers on your Ubuntu VPS via Dokploy:

```
Internet (HTTPS)
    │
    ├── app.yourdomain.com  ──►  client container  (React/nginx, port 80)
    └── api.yourdomain.com  ──►  server container  (Node.js,    port 5000)
```

---

## Prerequisites

- Ubuntu VPS with Dokploy already installed (port 3000 for Dokploy UI)
- A domain name with DNS access
- Your code pushed to a **GitHub** (or GitLab) repo

---

## Step 1 — Create a GitHub Repository

### 1.1 Create a `.gitignore` at the project root first

Create `platform/.gitignore` with this content:

```gitignore
node_modules/
dist/
*.db
*.db-journal
.env
server/data/
server/uploads/
```

### 1.2 Push to GitHub

Open **PowerShell** in `C:\Users\ahmed\Downloads\platform` and run:

```powershell
git init
git add .
git commit -m "initial commit: ChatPilot B2B platform"
```

Go to [github.com](https://github.com) → **New repository** → name it `chatpilot-b2b` → **Create repository** (keep it Private).

Then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/chatpilot-b2b.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Point Your DNS to the VPS

In your domain registrar (Cloudflare, Namecheap, etc.), add **2 A records**:

| Type | Name | Value        | TTL  |
|------|------|--------------|------|
| A    | api  | YOUR_VPS_IP  | Auto |
| A    | app  | YOUR_VPS_IP  | Auto |

This gives you:
- `api.yourdomain.com` → backend API
- `app.yourdomain.com` → frontend React app

> ⚠️ **Cloudflare users:** Set the **proxy status to DNS only (grey cloud)** for the `api` subdomain. WebSocket (used by Socket.IO for live order updates) needs a direct connection. You can re-enable it later once you confirm everything works.

Wait 1–5 minutes for DNS to propagate before continuing.

---

## Step 3 — Connect GitHub to Dokploy

1. Open Dokploy UI → `http://YOUR_VPS_IP:3000`
2. Log in with your Dokploy admin account
3. Go to **Settings** → **Git Providers** → click **Add GitHub**
4. Click **Connect with GitHub** → authorize Dokploy to access your repositories
5. After authorization, your GitHub account will appear as connected

---

## Step 4 — Create the Backend (Server) App

### 4.1 Create the App

1. In Dokploy, click **Create Project** (or select an existing project)
2. Inside the project, click **+ Create Service** → choose **Application**
3. Fill in the form:
   - **Name:** `chatpilot-server`
   - **Description:** (optional) Backend API

### 4.2 Connect GitHub Repo

1. Go to the **General** tab of the app
2. Under **Source**, select **GitHub**
3. Choose your repository: `YOUR_USERNAME/chatpilot-b2b`
4. **Branch:** `main`
5. **Build Type:** select `Dockerfile`
6. **Dockerfile Path:** `server/Dockerfile`
7. **Docker Context:** `server`

### 4.3 Set Environment Variables

Go to the **Environment** tab and add these variables (one per line or use the form):

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=PASTE_A_LONG_RANDOM_SECRET_HERE
DATABASE_URL=file:/app/data/prod.db
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
DEFAULT_AI_PROVIDER=gemini
```

> 💡 **Generate a secure JWT_SECRET** by running this on your VPS terminal (SSH in):
> ```bash
> openssl rand -hex 32
> ```
> Copy the output and paste it as JWT_SECRET.

> Add `OPENAI_API_KEY` or `OPENROUTER_API_KEY` if you also use those providers.

### 4.4 Add Volumes (Critical — Persistent Storage)

Go to the **Mounts** tab → click **+ Add Mount** for each of these:

| Mount Type | Host Path (Dokploy manages this) | Container Path       | Purpose |
|------------|----------------------------------|----------------------|---------|
| Volume     | `chatpilot_db`                   | `/app/data`          | SQLite database |
| Volume     | `chatpilot_uploads`              | `/app/uploads`       | Uploaded PDFs & images |
| Volume     | `chatpilot_sessions`             | `/app/data/sessions` | WhatsApp QR sessions |

> ⚠️ **Do not skip the sessions volume.** Without it, every time you redeploy, your WhatsApp session resets and you'll need to scan the QR code again.

### 4.5 Configure the Domain

Go to the **Domains** tab → click **+ Add Domain**:

- **Host:** `api.yourdomain.com`
- **Port:** `5000`
- **HTTPS:** toggle ON (Dokploy uses Let's Encrypt automatically)
- **Path:** `/`

### 4.6 Deploy the Server

Click the **Deploy** button (top right). Watch the **Logs** tab — you should see:

```
🚀 ChatPilot B2B Platform Server listening on port 5000
```

Test it: open `https://api.yourdomain.com/api/health` in your browser — you should get:
```json
{"status":"ok","timestamp":"...","service":"B2B AI WhatsApp Platform API"}
```

---

## Step 5 — Create the Frontend (Client) App

### 5.1 Create the App

1. Inside the same project, click **+ Create Service** → **Application**
2. **Name:** `chatpilot-client`

### 5.2 Connect GitHub Repo

Same repo, same branch, but different Docker settings:

- **Build Type:** `Dockerfile`
- **Dockerfile Path:** `client/Dockerfile`
- **Docker Context:** `client`

### 5.3 Set Build Arguments ⚠️ Important

Go to the **Build Arguments** tab (NOT Environment Variables — this is different!).

Add:

| Key           | Value                            |
|---------------|----------------------------------|
| `VITE_API_URL` | `https://api.yourdomain.com`    |

> ⚠️ This MUST be a **Build Argument**, not an environment variable. Vite compiles the URL into the JavaScript bundle at build time. If it's wrong or missing, Socket.IO won't connect and live order updates won't work.

### 5.4 Configure the Domain

Go to **Domains** → **+ Add Domain**:

- **Host:** `app.yourdomain.com`
- **Port:** `80`
- **HTTPS:** toggle ON
- **Path:** `/`

### 5.5 Deploy the Client

Click **Deploy**. The build takes 1–3 minutes (Vite compiles the React app).

When done, open `https://app.yourdomain.com` — you should see the ChatPilot login page.

---

## Step 6 — Create the Super Admin Account

The database starts empty. You need to seed the super admin once.

### Option A: Use Dokploy's Terminal

1. In Dokploy, open your `chatpilot-server` app
2. Go to the **Terminal** tab
3. Run the seed command:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
p.user.create({
  data: {
    email: 'admin@platform.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    name: 'Super Admin',
    role: 'SUPER_ADMIN'
  }
}).then(() => { console.log('Super admin created!'); p.\$disconnect(); });
"
```

### Option B: SSH into VPS

```bash
ssh root@YOUR_VPS_IP

# Find the container name
docker ps | grep chatpilot-server

# Open a shell in the container
docker exec -it CONTAINER_NAME sh

# Run the seed
node -e "..."
```

After seeding, log in at `https://app.yourdomain.com` with:
- **Email:** `admin@platform.com`
- **Password:** `admin123`

> ⚠️ Change the admin password immediately after first login!

---

## Step 7 — Connect WhatsApp for Your Company

1. Log in as the company admin (not super admin)
2. Go to **WhatsApp Setup** page
3. A QR code will appear — scan it with your phone
4. WhatsApp is now connected and the bot is live

The session is saved in the `/app/data/sessions` volume — it survives restarts and redeploys.

---

## Redeploying After Code Changes

Whenever you update your code:

```powershell
# In C:\Users\ahmed\Downloads\platform
git add .
git commit -m "your change description"
git push
```

Then in Dokploy → click **Deploy** on whichever app you changed (server, client, or both).

> 💡 You can also enable **Auto Deploy** in Dokploy to automatically redeploy when you push to GitHub.

---

## Troubleshooting

### ❌ `https://api.yourdomain.com/api/health` returns an error

- Check the **Logs** tab in Dokploy for the server app
- Make sure environment variables (especially `DATABASE_URL` and `JWT_SECRET`) are set correctly
- Verify the `/app/data` volume is mounted — the DB file needs a writable location

### ❌ Frontend loads but shows errors / can't log in

- Open browser DevTools → Network tab → look for failed API calls
- Make sure the `api.yourdomain.com` domain is working (try curl from VPS: `curl https://api.yourdomain.com/api/health`)
- Check CORS — the server allows all origins by default in this build

### ❌ Live order updates not working (no real-time)

- This means Socket.IO is failing
- Check that `VITE_API_URL` was set as a **Build Argument** (not env var) with the correct value `https://api.yourdomain.com`
- If you're using Cloudflare proxy on `api`, WebSocket connections may be blocked — disable the orange cloud proxy for that record

### ❌ WhatsApp QR code resets every time you redeploy

- The `/app/data/sessions` volume is missing or misconfigured
- Add the volume mount in Dokploy Mounts tab and redeploy

### ❌ Uploaded files (PDFs/images) disappear after redeploy

- The `/app/uploads` volume is missing
- Add the volume and redeploy

### ❌ `openssl` not available on Windows to generate JWT secret

Use this PowerShell command instead:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## Summary Checklist

- [ ] Code pushed to GitHub
- [ ] DNS: `api.yourdomain.com` and `app.yourdomain.com` pointing to VPS
- [ ] GitHub connected to Dokploy
- [ ] **Server app** created with:
  - [ ] Dockerfile path: `server/Dockerfile`, context: `server`
  - [ ] Environment variables set (JWT_SECRET, DATABASE_URL, GEMINI_API_KEY)
  - [ ] 3 volumes mounted (`/app/data`, `/app/uploads`, `/app/data/sessions`)
  - [ ] Domain `api.yourdomain.com` → port 5000
  - [ ] Deployed ✅ and `/api/health` returns ok
- [ ] **Client app** created with:
  - [ ] Dockerfile path: `client/Dockerfile`, context: `client`
  - [ ] Build argument `VITE_API_URL=https://api.yourdomain.com`
  - [ ] Domain `app.yourdomain.com` → port 80
  - [ ] Deployed ✅ and login page loads
- [ ] Super admin account seeded
- [ ] WhatsApp QR scanned for your company
