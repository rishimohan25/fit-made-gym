# 🏋️ FIT MADE GYM — Daily Workout QR & Personal Training Protocol
> **STAY FIT. BE ON TOP • ESTD 2017**

A mobile-first, full-stack personal training platform designed for **FIT MADE GYM**. Members scan the physical QR code on the gym floor to instantly load **today's assigned workout protocol** (Warm-Up, Working Sets with anatomical movement diagrams, Cardio Finisher, and Post-Workout Stretches).

Trainers manage the daily schedules, custom workouts, and rep targets via a secure, password-protected Admin Dashboard.

---

## ⚡ Features

### 1. 📲 QR Code Member Experience (`/`)
- **Strictly Today's Routine**: When scanned, it automatically detects the current day and serves **only today's protocol**. No unnecessary day switches or distractions for the member.
- **Human Muscle Infographic**: Realistic anatomical human silhouettes (Dual Anterior & Posterior views) highlighting the target muscle groups:
  - 🔴 **Crimson Glow**: Primary driver muscles (e.g. Pectorals, Lats, Quads).
  - 🟡 **Amber Glow**: Synergists and stabilizers (e.g. Triceps, Deltoids, Core).
- **Warm-Up & Mobility Protocol**: Specific pre-workout warm-ups with reps/duration, form cues, and muscle focus.
- **Interactive Set Tracker**: Gym goers can check off completed sets (`Set 1 ✓`, `Set 2 ✓`) directly on their phones.
- **Built-In Rest Countdown Timer**: Triggers an audio chime and countdown interval between sets.

### 2. 🔐 Password-Protected Admin Portal (`/admin`)
- **Authentication**: Secured by username and password (default: `admin` / `gympassword123`).
- **Changeable Password**: Change username & password at any time via the admin modal with PBKDF2 cryptographic hashing.
- **7-Day Tabs**: Individual tabs for Monday through Sunday.
- **Standard Exercise Catalog**: Grouped dropdown covering Chest, Back, Shoulders, Legs, Arms, and Core.
- **🌐 Web & AI Search for New Exercises**:
  - Type any new or custom lift (e.g. *Arnold Press*, *Landmine Press*, *Nordic Hamstring Curl*).
  - Uses AI & Web search (Exa / Gemini) to auto-detect anatomical recruitment (primary/secondary muscles), optimal rep ranges, and coaching cues.
  - Generates the human infographic for that lift on the fly.
  - Allows manual customization of muscle tags before saving.
- **Reordering & Deleting**: Easily move exercises up/down or remove them.
- **Persistent Storage**: Changes persist automatically to PostgreSQL or the JSON store.

### 3. 🖨️ Printable Gym QR Poster Generator
- Click **"Gym QR"** in the navigation bar to preview and download the high-resolution QR code.
- Click **"Print Gym Wall Poster"** to print an A4 / letter flyer ready to laminate and display on gym walls or equipment stations.

---

## 🚀 How the QR Code Works

1. **Static QR Code, Dynamic Routine**:
   The QR code encodes a single permanent web address (e.g. `https://your-gym.onrender.com` or `https://gym.yourdomain.com`).
2. **Never Needs Re-Printing**:
   You print the QR code flyer once and place it on your gym wall.
3. **Instant Daily Sync**:
   When a member scans the code on Monday, your server checks the date and displays Monday's chest routine. When they scan it on Tuesday, it displays Tuesday's back routine.
4. **Real-Time Trainer Updates**:
   When you update Wednesday's reps or exercises in `/admin`, any member who scans the QR code on Wednesday immediately sees the updated routine.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **UI & Anatomy**: React 19, `react-body-highlighter` (anatomical vector polygons)
- **QR Code Engine**: Zero-dependency pure JavaScript QR code generator (`src/lib/qrcode.js`)
- **AI & Web Search**: `@google/generative-ai` (Gemini) & `exa-js` (Exa Web Search)
- **Database**: PostgreSQL support (`pg` Pool) with automatic fallback to local persistent JSON store (`data/gym_schedule.json`)
- **Authentication**: Salted PBKDF2 password verification + JWT sessions

---

## 💻 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   EXA_API_KEY=your_exa_api_key
   JWT_SECRET=your_secure_secret_key
   # Optional: set DATABASE_URL if using PostgreSQL
   # DATABASE_URL=postgres://user:password@localhost:5432/workout_tracker
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) for the member view, and [http://localhost:3000/admin](http://localhost:3000/admin) for the admin portal.

---

## ☁️ Deployment Guide: Render vs. OCI

### Option A: Render (Recommended for Quickest, Zero-Maintenance Setup)

**Why Choose Render?**
- Easiest setup (~5 minutes).
- Automatic deployments on `git push`.
- Free automatic SSL certificates (HTTPS).
- One-click managed PostgreSQL database.
- Zero server, Linux, or Nginx/Caddy maintenance.

**Steps to Deploy on Render:**
1. Push this repository to GitHub or GitLab.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Environment Variables (Optional):
   - `JWT_SECRET`: *(a random string for session tokens)*
   - `EXA_API_KEY`: *(optional, for web searching new custom lifts)*
   - `GEMINI_API_KEY`: *(optional, for AI biomechanics summaries)*
   *(Note: The app runs completely fine even without any AI or search keys, using its built-in anatomical catalog!)*
6. (Optional) Under **New + > PostgreSQL**, create a free or starter database, copy the **Internal Database URL**, and paste it into your Web Service environment variables as `DATABASE_URL`.
7. Click **Deploy Web Service**.
8. Once deployed, open your live URL (e.g. `https://iron-forge-gym.onrender.com`), go to `/admin`, and print your gym floor QR poster!

---

### Option B: OCI (Oracle Cloud Infrastructure — Free Forever VM)

**Why Choose OCI?**
- Oracle Cloud "Always Free" tier provides a powerful 4-core Ampere ARM CPU and 24GB RAM instance forever without monthly hosting fees.
- 24/7 dedicated availability with no spin-down or cold starts.

**Steps to Deploy on OCI:**
1. **Create an OCI VM Instance**:
   - Compute > Instances > Create Instance (choose Ubuntu 22.04 or 24.04).
   - In Virtual Cloud Network (VCN) Ingress Rules, allow incoming TCP on ports `80` (HTTP) and `443` (HTTPS).
2. **Install Docker & Docker Compose on the VM**:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker ubuntu
   ```
3. **Clone the Repo to the VM**:
   ```bash
   git clone <your-repo-url> gym
   cd gym
   ```
4. **Configure Domain & Environment**:
   - Create `.env.local` with your `GEMINI_API_KEY`, `EXA_API_KEY`, and `JWT_SECRET`.
   - Update `Caddyfile` with your domain name (Caddy will automatically provision free Let's Encrypt SSL!):
     ```
     gym.yourdomain.com {
         reverse_proxy app:3000
     }
     ```
5. **Launch with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```
6. The app and Caddy reverse proxy will start and automatically keep running.

---

## 🔑 Default Admin Credentials

- **URL**: `/admin`
- **Username**: `admin`
- **Password**: `gympassword123`

*Note: Please change this password upon your first login using the "Change Password" button in the admin navigation bar.*
