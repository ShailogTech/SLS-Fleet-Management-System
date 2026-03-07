# SLT Fleet Management - Tech Stack & AWS Deployment Guide

---

## 1. Complete Tech Stack

### 1.1 Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 (pinned via `.python-version`) | Runtime language |
| FastAPI | 0.110.1 | Async REST API framework |
| Uvicorn | 0.25.0 | ASGI production server |
| Motor | 3.3+ | Async MongoDB driver for Python |
| PyMongo | 4.6+ | MongoDB Python client (used by Motor internally) |
| Pydantic | 2.0+ (with email-validator) | Request/response data validation & serialization |
| python-jose | 3.3+ (with cryptography backend) | JWT token creation & verification (HS256 algorithm) |
| passlib | 1.7+ (with bcrypt backend) | Password hashing abstraction layer |
| bcrypt | 4.0.1 (pinned) | Cryptographic password hashing (salted) |
| httpx | 0.24+ | Async HTTP client for external API calls (Gemini) |
| python-dotenv | 1.0+ | Load environment variables from `.env` files |
| python-multipart | 0.0.6+ | Multipart form-data parsing for file uploads |
| dnspython | 2.0+ | DNS resolution for MongoDB Atlas SRV records |
| certifi | 2023+ | Mozilla's CA certificate bundle for SSL/TLS |

### 1.2 Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.0.0 | Core UI framework |
| React DOM | 19.0.0 | React rendering engine |
| React Router DOM | 7.5.1 | Client-side routing with nested routes & guards |
| Create React App | 5.0.1 | React app bootstrapping & build pipeline |
| Craco | 7.1.0 | CRA configuration override (custom webpack/babel) |
| Tailwind CSS | 3.4.17 | Utility-first CSS framework |
| tailwindcss-animate | 1.0.7 | Animation utilities for Tailwind |
| tailwind-merge | 3.2.0 | Intelligent Tailwind class merging |
| class-variance-authority | 0.7.1 | Type-safe CSS variant composition |
| clsx | 2.1.1 | Conditional className construction |
| Axios | 1.8.4 | HTTP client with request/response interceptors |
| Lucide React | 0.507.0 | Icon library (50+ icons used) |
| PostCSS | 8.4.49 | CSS transformation & processing |
| Autoprefixer | 10.4.20 | Automatic vendor prefix insertion |

**UI Component Library (shadcn/ui + Radix UI):**

| Package | Purpose |
|---|---|
| @radix-ui/react-dialog | Modal dialogs (vehicle/driver detail) |
| @radix-ui/react-select | Dropdown selects (filters, plant selection) |
| @radix-ui/react-tabs | Tab panels (vehicle details, approvals) |
| @radix-ui/react-accordion | Collapsible sections |
| @radix-ui/react-alert-dialog | Confirmation dialogs |
| @radix-ui/react-avatar | User profile avatars |
| @radix-ui/react-checkbox | Checkboxes (form fields) |
| @radix-ui/react-dropdown-menu | Context menus, action menus |
| @radix-ui/react-label | Form field labels |
| @radix-ui/react-popover | Floating popovers |
| @radix-ui/react-progress | Progress bars |
| @radix-ui/react-scroll-area | Custom scrollable areas |
| @radix-ui/react-separator | Visual dividers |
| @radix-ui/react-slot | Component composition primitive |
| @radix-ui/react-switch | Toggle switches |
| @radix-ui/react-toast | Toast notifications (via Sonner) |
| @radix-ui/react-tooltip | Hover tooltips |
| @radix-ui/react-hover-card | Rich hover previews |
| @radix-ui/react-navigation-menu | Navigation menus |
| @radix-ui/react-menubar | Menu bar component |
| @radix-ui/react-radio-group | Radio button groups |
| @radix-ui/react-slider | Range slider inputs |
| @radix-ui/react-toggle | Toggle buttons |
| @radix-ui/react-toggle-group | Toggle button groups |
| @radix-ui/react-collapsible | Collapsible containers |
| @radix-ui/react-context-menu | Right-click context menus |
| @radix-ui/react-aspect-ratio | Aspect ratio containers |

**Feature-Specific Libraries:**

| Technology | Version | Purpose |
|---|---|---|
| React Hook Form | 7.56.2 | Performant form state management |
| @hookform/resolvers | 5.0.1 | Schema validation adapters for forms |
| Zod | 3.24.4 | Schema validation library |
| Leaflet | 1.9.4 | Interactive map library |
| React Leaflet | 5.0.0 | React components for Leaflet maps |
| Recharts | 3.6.0 | Dashboard charts & data visualization |
| jsPDF | 4.1.0 | Client-side PDF generation |
| jspdf-autotable | 5.0.7 | Table-to-PDF plugin |
| XLSX (SheetJS) | 0.18.5 | Excel file read/write & CSV import |
| React Dropzone | 15.0.0 | Drag-and-drop file upload zones |
| Sonner | 2.0.3 | Toast notification system |
| next-themes | 0.4.6 | Theme provider (light/dark mode) |
| Lottie React | 2.4.1 | Lottie vector animation player |
| date-fns | 4.1.0 | Date manipulation & formatting |
| react-day-picker | 8.10.1 | Date picker component |
| input-otp | 1.4.2 | OTP input component |
| embla-carousel-react | 8.6.0 | Carousel/slider component |
| react-resizable-panels | 3.0.1 | Resizable panel layouts |
| vaul | 1.1.2 | Drawer component primitive |
| cmdk | 1.1.1 | Command palette / search component |

**Dev Tools:**

| Technology | Version | Purpose |
|---|---|---|
| ESLint | 8.57.0 | JavaScript linting |
| eslint-plugin-react | 7.33.2 | React-specific linting rules |
| eslint-plugin-react-hooks | 4.6.0 | Hooks rules enforcement |
| eslint-plugin-jsx-a11y | 6.8.0 | Accessibility linting |
| eslint-plugin-import | 2.29.1 | Import order & resolution linting |
| @babel/plugin-proposal-private-property-in-object | 7.21.11 | Private class fields support |

### 1.3 Database

| Technology | Details |
|---|---|
| MongoDB Atlas | Cloud-hosted MongoDB cluster |
| Cluster | cluster0.7boo4ke.mongodb.net |
| Database Name | sls_fleet_db |
| Driver | Motor (async) + PyMongo |
| Connection | mongodb+srv:// with TLS |
| Collections | 11 collections (users, vehicles, drivers, tenders, plants, approvals, documents, photos, stoppages, personal_vehicles, profile_edits) |

### 1.4 External Services & APIs

| Service | Purpose | Auth Method |
|---|---|---|
| MongoDB Atlas | Primary database | Connection string with credentials |
| Google Gemini API | AI chatbot (gemini-2.0-flash model) | API key (`GEMINI_API_KEY`) |
| OpenStreetMap | Map tile server for GPS tracker | Free, no auth required |
| Google Fonts CDN | Inter & Chivo font families | Free, no auth required |
| Leaflet CDN | Map marker icon assets | Free, no auth required |

### 1.5 Authentication & Security

| Component | Implementation |
|---|---|
| Auth Method | JWT Bearer tokens (not cookies) |
| Algorithm | HS256 |
| Token Expiry | 7 days (604,800 minutes) |
| Password Hashing | bcrypt via passlib (salted, cost factor default) |
| Authorization | Role-based access control (RBAC) with 12 roles and hierarchy levels |
| CORS | Configured for specific frontend origins |
| File Validation | Type + size checks on upload (PDF, JPG, PNG, DOC, max 25MB) |

### 1.6 File Storage

| Type | Storage Method | Details |
|---|---|---|
| Vehicle/Driver Documents | Base64 in MongoDB (`documents` collection) | Insurance, registration, DL, hazmat certs |
| Profile Photos | Base64 in MongoDB (`photos` collection) | User avatars, max 10MB |
| No filesystem storage | Render's ephemeral FS is unreliable | All files stored in DB |

### 1.7 Current Deployment

| Component | Platform | Plan |
|---|---|---|
| Backend API | Render.com | Free tier |
| Frontend SPA | Vercel | Free tier |
| Database | MongoDB Atlas | Free tier (M0) |
| DNS/SSL | Managed by Render & Vercel | Automatic |

---

## 2. AWS Services Required

### 2.1 Core Services (Required)

#### 1. Amazon S3 — Frontend Hosting + File Storage

**Purpose:** Host the React static build AND store uploaded documents/photos.

**Replaces:** Vercel (frontend hosting) + base64-in-MongoDB (file storage)

**Why:**
- React builds to static files (HTML, JS, CSS) — S3 serves these perfectly
- Documents currently stored as base64 strings in MongoDB bloat the database significantly (a 5MB PDF becomes ~6.7MB as base64 text). S3 is purpose-built for file storage with virtually unlimited capacity.

**Configuration:**
- Bucket 1: `slt-fleet-frontend` — React build output, public read via CloudFront
- Bucket 2: `slt-fleet-uploads` — Vehicle documents, driver documents, profile photos (private, accessed via pre-signed URLs)

**Cost Estimate:**
| Item | Usage | Monthly Cost |
|---|---|---|
| S3 Storage (frontend) | ~50 MB static files | < $0.01 |
| S3 Storage (uploads) | ~5 GB documents/photos | ~$0.12 |
| S3 Requests | ~100,000 GET + 5,000 PUT/mo | ~$0.05 |
| **Subtotal** | | **~$0.20/mo** |

---

#### 2. Amazon CloudFront — CDN for Frontend

**Purpose:** Serve React app globally with low latency, HTTPS termination, caching.

**Replaces:** Vercel's edge network

**Why:**
- S3 alone doesn't provide HTTPS on custom domains or global edge caching
- CloudFront caches static assets at 400+ edge locations worldwide
- Handles SPA routing (redirect 404s to index.html)

**Configuration:**
- Origin: S3 bucket (`slt-fleet-frontend`)
- Custom error response: 404 → /index.html (SPA routing)
- HTTPS only with ACM certificate
- Cache policy: CacheOptimized for static assets

**Cost Estimate:**
| Item | Usage | Monthly Cost |
|---|---|---|
| Data transfer out | ~10 GB/mo | ~$0.85 |
| HTTP requests | ~500,000/mo | ~$0.50 |
| **Subtotal** | | **~$1.35/mo** |

---

#### 3. AWS App Runner — Backend Hosting

**Purpose:** Run FastAPI + Uvicorn backend as a managed container service.

**Replaces:** Render.com

**Why:**
- Fully managed — no EC2 instance patching, scaling, or load balancer configuration
- Auto-scales from 0 to N instances based on traffic
- Supports Python 3.11 runtime directly
- Built-in health checks, logging, and HTTPS
- No cold start issues like Render free tier (which sleeps after 15 minutes of inactivity)

**Alternative:** EC2 t3.micro (~$8/mo) if you want full server control, but requires manual setup of systemd, nginx, SSL, and updates.

**Configuration:**
- Runtime: Python 3.11
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port 8000`
- Min instances: 1 (always warm), Max instances: 3
- vCPU: 0.25, Memory: 0.5 GB (sufficient for async FastAPI)

**Cost Estimate:**
| Item | Usage | Monthly Cost |
|---|---|---|
| Active instance (0.25 vCPU, 0.5 GB) | 730 hrs/mo | ~$5.00 |
| Provisioned instance (keep warm) | 730 hrs/mo | ~$2.50 |
| Request processing | ~200,000 requests/mo | ~$0.15 |
| **Subtotal** | | **~$7.65/mo** |

---

#### 4. MongoDB Atlas on AWS (Keep Existing)

**Purpose:** Primary database — keep MongoDB Atlas but select AWS as the cloud provider.

**Why NOT Amazon DocumentDB:**
- DocumentDB is MongoDB-compatible but NOT identical — some Motor/PyMongo features may behave differently
- Atlas M0 (free) or M2 ($9/mo) is cheaper than DocumentDB (~$60/mo minimum)
- Atlas already runs on AWS infrastructure — just select `aws` and `ap-south-1` (Mumbai) as the region
- Zero code changes required

**Configuration:**
- Cloud Provider: AWS
- Region: ap-south-1 (Mumbai) — closest to Sri Lanka
- Cluster Tier: M0 (free, 512MB) → M2 ($9/mo, 2GB) → M10 ($57/mo, 10GB+) as needed
- Network: VPC Peering with App Runner's VPC for private connectivity

**Cost Estimate:**
| Tier | Storage | Monthly Cost |
|---|---|---|
| M0 (Free) | 512 MB | $0 |
| M2 (Starter) | 2 GB | $9 |
| M5 (Production) | 5 GB | $25 |
| M10 (Production+) | 10 GB+ | $57 |
| **Recommended (M2)** | | **~$9.00/mo** |

---

#### 5. AWS Certificate Manager (ACM) — SSL Certificates

**Purpose:** Free SSL/TLS certificates for HTTPS on custom domains.

**Replaces:** Render/Vercel auto-SSL

**Configuration:**
- Certificate for: `fleet.yourdomain.com` (frontend) + `api.fleet.yourdomain.com` (backend)
- Auto-renewal: Yes (managed by AWS)
- Validation: DNS validation via Route 53

**Cost:** **Free** (when used with CloudFront/ALB/App Runner)

---

#### 6. Amazon Route 53 — DNS Management

**Purpose:** Domain name management and DNS routing.

**Replaces:** Render/Vercel DNS

**Configuration:**
- Hosted zone for your domain
- A record → CloudFront distribution (frontend)
- A record → App Runner service URL (backend API)
- Health checks (optional)

**Cost Estimate:**
| Item | Monthly Cost |
|---|---|
| Hosted zone | $0.50 |
| DNS queries (~1M/mo) | ~$0.40 |
| **Subtotal** | **~$0.90/mo** |

---

#### 7. AWS Secrets Manager / SSM Parameter Store — Secrets

**Purpose:** Securely store and rotate environment variables.

**Replaces:** `.env` files

**Secrets to store:**
```
MONGO_URL          → MongoDB Atlas connection string
JWT_SECRET_KEY     → JWT signing key
GEMINI_API_KEY     → Google Gemini API key
CORS_ORIGINS       → Allowed frontend URLs
DB_NAME            → sls_fleet_db
```

**Cost Estimate:**
| Service | Monthly Cost |
|---|---|
| SSM Parameter Store (Standard) | **Free** (up to 10,000 parameters) |
| Secrets Manager (if rotation needed) | ~$2.00 (5 secrets x $0.40) |
| **Recommended (Parameter Store)** | **$0.00** |

---

### 2.2 Recommended Services (Should-Have)

#### 8. Amazon CloudWatch — Monitoring & Logging

**Purpose:** Application logging, error tracking, performance metrics.

**Replaces:** Render's log viewer

**What to monitor:**
- API response times and error rates (5xx, 4xx)
- MongoDB connection health
- App Runner instance CPU/memory usage
- Custom metrics: login failures, document uploads, approval queue size

**Cost Estimate:**
| Item | Monthly Cost |
|---|---|
| Log ingestion (~5 GB/mo) | ~$2.50 |
| Log storage (~5 GB/mo) | ~$1.50 |
| Custom metrics (10 metrics) | ~$3.00 |
| Dashboards (3) | $9.00 |
| Alarms (5) | ~$0.50 |
| **Subtotal** | **~$16.50/mo** |

*Can be reduced to ~$4/mo by skipping dashboards and using basic metrics only.*

---

#### 9. AWS IAM — Access Control

**Purpose:** Service-to-service authentication and permissions.

**Configuration:**
- App Runner execution role → access S3 uploads bucket, Parameter Store, CloudWatch
- S3 bucket policies → CloudFront OAI for frontend, pre-signed URLs for uploads
- Least-privilege principle for all roles

**Cost:** **Free** (IAM has no charges)

---

### 2.3 Optional Services (Nice-to-Have)

#### 10. Amazon SES — Email Notifications

**Purpose:** Send email alerts for document expiry, approval notifications, password resets.

**When needed:** If you want to add email notifications (currently not implemented).

**Cost Estimate:**
| Item | Monthly Cost |
|---|---|
| First 62,000 emails/mo (from EC2/App Runner) | **Free** |
| Beyond 62K | $0.10 per 1,000 |
| **Estimated** | **$0.00 - $1.00/mo** |

---

#### 11. AWS Lambda + EventBridge — Scheduled Tasks

**Purpose:** Run periodic jobs without a dedicated server.

**Use cases:**
- Auto-expire tenders past their end date (currently computed client-side)
- Send document expiry reminder emails (7 days, 30 days before expiry)
- Database cleanup and archival of old approvals
- Generate monthly fleet reports

**Configuration:**
- Lambda function: Python 3.11, triggered by EventBridge schedule
- Schedule: `rate(1 day)` for daily checks
- Memory: 128 MB, Timeout: 30 seconds

**Cost Estimate:**
| Item | Monthly Cost |
|---|---|
| Lambda invocations (30/mo) | **Free** (1M free/mo) |
| Lambda duration | **Free** (400,000 GB-s free/mo) |
| EventBridge rules | **Free** (first 14M events) |
| **Subtotal** | **$0.00** |

---

#### 12. Amazon ElastiCache (Redis) — Caching

**Purpose:** Cache frequently accessed data to reduce MongoDB load.

**When needed:** If dashboard stats or approval queue queries become slow at scale.

**What to cache:**
- Dashboard stats (TTL: 5 minutes)
- Plant list for dropdowns (TTL: 1 hour)
- User sessions/permissions (TTL: 15 minutes)

**Cost Estimate:**
| Item | Monthly Cost |
|---|---|
| cache.t3.micro (0.5 GB) | ~$12.00 |
| **Subtotal** | **~$12.00/mo** |

*Only add if performance issues arise. Not needed at current scale.*

---

#### 13. AWS WAF — Web Application Firewall

**Purpose:** Protect API from abuse, SQL injection, XSS, and rate limiting.

**Configuration:**
- Attach to CloudFront (frontend) and App Runner (backend)
- Rules: Rate limiting (1000 req/5min per IP), SQL injection protection, known bad IP blocking

**Cost Estimate:**
| Item | Monthly Cost |
|---|---|
| Web ACL | $5.00 |
| Rules (5) | $5.00 |
| Requests (1M/mo) | $0.60 |
| **Subtotal** | **~$10.60/mo** |

*Optional security layer. Can be added later.*

---

#### 14. Amazon Cognito — Managed Authentication (Optional)

**Purpose:** Replace custom JWT auth with AWS-managed authentication.

**Why you might NOT need it:**
- Current JWT + bcrypt implementation works well
- Cognito adds complexity and vendor lock-in
- Only consider if you need OAuth2 (Google/Microsoft login), MFA, or user federation

**Cost:** Free for first 50,000 MAUs, then $0.0055/MAU

*Recommendation: Keep current JWT auth. It's simple, proven, and has zero cost.*

---

## 3. Cost Estimation Summary

### Option A: Minimal Setup — ~$14/mo

Best for: Development, testing, low-traffic internal tool (< 50 users).

| Service | Spec | $/mo |
|---|---|---|
| App Runner | 0.25 vCPU, 0.5 GB RAM | $7.65 |
| S3 | Frontend build + uploads (~5 GB) | $0.20 |
| CloudFront | CDN, ~10 GB transfer | $1.35 |
| MongoDB Atlas | M0 free tier (512 MB) | $0.00 |
| Route 53 | 1 hosted zone | $0.90 |
| ACM | SSL certificate | $0.00 |
| Parameter Store | Secrets storage | $0.00 |
| IAM | Access control | $0.00 |
| CloudWatch | Basic logs only | $4.00 |
| **Total** | | **$14.10** |

**What you get:** Always-on backend (no cold starts like Render free tier), HTTPS, CDN-served frontend, free MongoDB.
**What you don't get:** Email notifications, scheduled jobs, monitoring dashboards, auto-scaling.

---

### Option B: Production Setup — ~$36/mo

Best for: Active production use, 50-200 users, reliable uptime.

| Service | Spec | $/mo |
|---|---|---|
| App Runner | 0.5 vCPU, 1 GB RAM, min 1 instance | $15.00 |
| S3 | Frontend + uploads (10 GB) | $0.50 |
| CloudFront | CDN, ~20 GB transfer | $2.50 |
| MongoDB Atlas | M2 (2 GB, automated backups) | $9.00 |
| Route 53 | 1 hosted zone | $0.90 |
| ACM | SSL certificate | $0.00 |
| Parameter Store | Secrets storage | $0.00 |
| IAM | Access control | $0.00 |
| CloudWatch | Logs + metrics + 5 alarms | $8.00 |
| SES | Email notifications (62K free/mo) | $0.00 |
| Lambda + EventBridge | Daily expiry checks, reports | $0.00 |
| **Total** | | **$35.90** |

**What you get:** Everything in Option A + database backups, email alerts, scheduled jobs (tender expiry, document reminders), monitoring with alarms, more compute headroom.
**What you don't get:** Auto-scaling, Redis caching, WAF protection, dashboards.

---

### Option C: Enterprise Setup — ~$169/mo

Best for: Large fleet, 500+ users, high availability, compliance.

| Service | Spec | $/mo |
|---|---|---|
| ECS Fargate | 2 tasks, 0.5 vCPU + 1 GB each | $35.00 |
| ALB | Application Load Balancer | $22.00 |
| S3 | Frontend + uploads (50 GB) | $2.00 |
| CloudFront | CDN, ~100 GB transfer | $10.00 |
| MongoDB Atlas | M10 (10 GB, replicas, PITR backups) | $57.00 |
| Route 53 | 1 hosted zone | $0.90 |
| ACM | SSL certificate | $0.00 |
| Secrets Manager | Secrets with auto-rotation | $2.00 |
| IAM | Access control | $0.00 |
| CloudWatch | Full monitoring + 3 dashboards | $16.50 |
| SES | Email notifications | $1.00 |
| Lambda + EventBridge | Scheduled tasks | $0.00 |
| ElastiCache | Redis t3.micro (0.5 GB cache) | $12.00 |
| WAF | Firewall, rate limiting, 5 rules | $10.60 |
| **Total** | | **$169.00** |

**What you get:** Everything in Option B + auto-scaling containers, load balancing, Redis caching, WAF protection, secret rotation, replica database, point-in-time recovery, full monitoring dashboards.
**Best for:** Multi-plant deployment with hundreds of concurrent users, audit/compliance needs.

---

### Cost Comparison: Current vs AWS

| | Current (Render + Vercel) | AWS Option A | AWS Option B | AWS Option C |
|---|---|---|---|---|
| Monthly Cost | $0 (free tiers) | ~$14 | ~$36 | ~$169 |
| Backend Uptime | Sleeps after 15min idle | Always on | Always on | Always on, auto-scaling |
| Cold Start | 30-60 sec after sleep | None | None | None |
| File Storage | Base64 in MongoDB (bloats DB) | S3 (proper storage) | S3 (proper storage) | S3 (proper storage) |
| SSL | Auto (free) | ACM (free) | ACM (free) | ACM (free) |
| Monitoring | Basic Render logs | CloudWatch basic | CloudWatch full | CloudWatch + dashboards |
| Email | None | None | SES (free tier) | SES |
| Scheduled Jobs | None | None | Lambda (free) | Lambda (free) |
| Scalability | Limited | Good | Better | Production-grade |
| Database Backup | Manual | Atlas automated | Atlas automated | Atlas automated + PITR |

---

## 4. Recommended Architecture Diagram

```
                         Users (Browser)
                              |
                         Route 53 (DNS)
                              |
                     ACM (SSL Certificate)
                              |
                    +----CloudFront (CDN)----+
                    |                        |
                    v                        v
            S3 Bucket                  App Runner
         (React Build)             (FastAPI + Uvicorn)
         fleet.domain.com          api.fleet.domain.com
                                         |
                              +----------+----------+
                              |          |          |
                              v          v          v
                         MongoDB    S3 Bucket   Parameter
                          Atlas     (Uploads)    Store
                        (ap-south-1) (Documents) (Secrets)
                              |
                              v
                         CloudWatch
                        (Logs & Metrics)

    Optional:
    +-- Lambda + EventBridge (scheduled tasks: expiry checks, reports)
    +-- SES (email notifications)
    +-- WAF (API protection)
```

---

## 5. Migration Checklist

### Phase 1: Infrastructure Setup
- [ ] Create AWS account and enable billing alerts
- [ ] Set up IAM admin user (never use root account)
- [ ] Create S3 buckets (frontend + uploads)
- [ ] Configure CloudFront distribution with S3 origin
- [ ] Set up Route 53 hosted zone and DNS records
- [ ] Request ACM certificate for your domain
- [ ] Store secrets in SSM Parameter Store

### Phase 2: Backend Deployment
- [ ] Create App Runner service with Python 3.11
- [ ] Configure environment variables from Parameter Store
- [ ] Point MongoDB Atlas network access to App Runner's VPC
- [ ] Verify all API endpoints work
- [ ] Set up CloudWatch log groups and basic alarms

### Phase 3: Frontend Deployment
- [ ] Update `REACT_APP_BACKEND_URL` to App Runner URL
- [ ] Run `craco build` to generate production build
- [ ] Upload build output to S3 frontend bucket
- [ ] Invalidate CloudFront cache
- [ ] Verify SPA routing works (404 → index.html)

### Phase 4: File Storage Migration
- [ ] Update document upload endpoint to save files to S3 instead of base64-in-MongoDB
- [ ] Update document retrieval endpoint to generate S3 pre-signed URLs
- [ ] Migrate existing base64 documents from MongoDB to S3 (one-time script)
- [ ] Update profile photo upload/retrieval to use S3

### Phase 5: Enhancements (Optional)
- [ ] Set up SES for email notifications
- [ ] Create Lambda functions for scheduled tasks (expiry checks)
- [ ] Add EventBridge rules for daily/weekly schedules
- [ ] Configure WAF rules if public-facing
- [ ] Set up CloudWatch dashboards for monitoring

---

## 6. Environment Variables on AWS

### SSM Parameter Store Keys

```
/slt-fleet/prod/MONGO_URL              = mongodb+srv://user:pass@cluster.mongodb.net/...
/slt-fleet/prod/DB_NAME                = sls_fleet_db
/slt-fleet/prod/JWT_SECRET_KEY         = <random-256-bit-key>
/slt-fleet/prod/GEMINI_API_KEY         = <google-gemini-api-key>
/slt-fleet/prod/CORS_ORIGINS           = https://fleet.yourdomain.com
/slt-fleet/prod/AWS_S3_UPLOADS_BUCKET  = slt-fleet-uploads
/slt-fleet/prod/AWS_REGION             = ap-south-1
```

### Frontend Build Environment

```
REACT_APP_BACKEND_URL = https://api.fleet.yourdomain.com
```

---

*Document generated: 2026-03-07*
*Project: SLT Fleet Management System*
