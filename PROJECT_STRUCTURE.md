# SLT Fleet Management System - Project Structure

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, Motor (async MongoDB) |
| Frontend | React 19, Tailwind CSS, shadcn/ui (Radix) |
| Database | MongoDB Atlas |
| Deployment | Backend on Render, Frontend on Vercel |
| Auth | JWT (python-jose), bcrypt password hashing |

---

## Root Directory

```
Fleet-management/
├── backend/                    Python FastAPI backend
├── frontend/                   React frontend
├── .gitignore
├── render.yaml                 Render deployment config
├── PRD.md                      Product Requirements Document
├── USER_CREDENTIALS.md         Test user credentials
├── design_guidelines.json      UI design standards
└── README.md
```

---

## Backend Structure

```
backend/
├── server.py                   FastAPI app entry point, MongoDB connection
├── requirements.txt            Python dependencies
├── .env                        Environment variables (MONGO_URI, JWT_SECRET)
│
├── models/                     Pydantic data models
│   ├── approval.py             Approval workflow (checker -> approver flow)
│   ├── driver.py               Driver profile (name, emp_id, DL, plant)
│   ├── personal_vehicle.py     Personal vehicles (superuser feature)
│   ├── plant.py                Plant/facility (name, type, city, state)
│   ├── stoppage.py             Vehicle stoppage/downtime records
│   ├── tender.py               Tender/contract (client, dates, vehicles)
│   ├── user.py                 User account (email, role, status)
│   └── vehicle.py              Fleet vehicle (vehicle_no, engine_no, docs)
│
├── routes/                     API endpoint handlers
│   ├── auth.py                 POST /auth/login, /auth/signup
│   ├── users.py                GET/POST/PUT/DELETE /users, profile endpoints
│   ├── vehicles.py             GET/POST/PUT/DELETE /vehicles, assign-driver, shift
│   ├── drivers.py              GET/POST/PUT/DELETE /drivers, assign-vehicle
│   ├── tenders.py              GET/POST/PUT/DELETE /tenders
│   ├── plants.py               GET/POST/PUT/DELETE /plants
│   ├── approvals.py            GET /approvals/queue, check, approve, comment
│   ├── documents.py            POST /documents/upload, GET /documents/{type}/{id}
│   ├── dashboard.py            GET /dashboard/stats
│   ├── stoppages.py            GET/POST/PUT/DELETE /stoppages
│   ├── personal_vehicles.py    GET/POST/PUT/DELETE /personal-vehicles
│   ├── plant_portal.py         GET /plant-portal/my-plant, vehicles, drivers
│   ├── driver_portal.py        GET /driver-portal/my-info
│   └── chatbot.py              POST /chatbot/ask
│
├── utils/
│   ├── jwt.py                  Token creation/validation, password hashing
│   ├── permissions.py          get_current_user dependency, role checks
│   └── plant_helpers.py        get_incharge_plant_names helper
│
├── seed_all.py                 Full database reset & seed from CSV
├── seed_users.py               Seed user accounts
├── seed_plants.py              Seed plant records
└── seed_from_csv.py            Seed vehicles/drivers from CSV
```

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT token |
| GET | `/api/vehicles` | List vehicles (filtered by role/plant) |
| POST | `/api/vehicles` | Create vehicle (maker/admin) |
| POST | `/api/vehicles/{id}/shift` | Renumber vehicle, records shift history |
| POST | `/api/vehicles/{id}/assign-driver` | Assign driver to vehicle |
| GET | `/api/drivers` | List drivers (filtered by role/plant) |
| POST | `/api/drivers/{id}/assign-vehicle` | Assign vehicle to driver |
| GET | `/api/tenders` | List all tenders |
| POST | `/api/tenders` | Create tender, syncs assigned vehicles |
| GET | `/api/approvals/queue` | Get all approvals (batch-enriched) |
| POST | `/api/approvals/{id}/check` | Checker reviews submission |
| POST | `/api/approvals/{id}/approve` | Approver final decision |
| GET | `/api/approvals/my-submissions` | Maker's submitted items with comments |
| POST | `/api/documents/upload` | Upload document file |
| GET | `/api/plant-portal/my-plant` | Plant incharge dashboard data |
| GET | `/api/dashboard/stats` | Admin dashboard statistics |

---

## Frontend Structure

```
frontend/src/
├── index.js                    React entry point
├── App.js                      Router setup, role-based routes
├── index.css                   Global styles + Tailwind imports
│
├── contexts/
│   ├── AuthContext.js           Auth state, login/logout, token management
│   └── RefreshContext.js        Global data refresh trigger
│
├── utils/
│   └── api.js                  Axios instance, 401 interceptor
│
├── layouts/
│   └── DashboardLayout.js      Sidebar + Header + main content wrapper
│
├── components/
│   ├── ProtectedRoute.js       Role-based route guard
│   ├── SplashScreen.js         App loading screen
│   ├── Chatbot.js              AI chatbot floating widget
│   ├── GPSTracker.js           Leaflet map GPS tracking
│   │
│   ├── common/
│   │   ├── StatusBadge.js      Color-coded status pill (active/pending/expired/on_leave)
│   │   └── TruckLoader.js      Lottie truck loading animation
│   │
│   ├── modals/
│   │   ├── VehicleDetailModal.js   Vehicle view/edit dialog (details, docs, assignment, shift history)
│   │   └── DriverDetailModal.js    Driver view/edit dialog (details, docs, assignment)
│   │
│   ├── documents/
│   │   └── DocumentUpload.js   File upload with drag-and-drop
│   │
│   ├── navigation/
│   │   ├── Sidebar.js          Role-based sidebar navigation
│   │   └── Header.js           Top bar with user info, notifications
│   │
│   └── ui/                     shadcn/ui components (50+ Radix-based)
│       ├── button.jsx, input.jsx, label.jsx, card.jsx
│       ├── dialog.jsx, select.jsx, tabs.jsx, textarea.jsx
│       ├── table.jsx, badge.jsx, skeleton.jsx, sonner.jsx
│       └── ... (accordion, calendar, dropdown-menu, etc.)
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.js        Email/password login form
│   │   └── SignupPage.js       New user registration
│   │
│   ├── dashboard/
│   │   └── Dashboard.js        Admin dashboard with stats cards
│   │
│   ├── vehicles/
│   │   ├── VehicleList.js      Vehicle table with search, filters, export
│   │   └── VehicleForm.js      Multi-step vehicle creation wizard
│   │
│   ├── drivers/
│   │   ├── DriverList.js       Driver table with search, filters
│   │   ├── DriverForm.js       Multi-step driver creation wizard
│   │   └── DriverPortal.js     Driver's personal dashboard
│   │
│   ├── tenders/
│   │   └── TenderManagement.js Tender CRUD, vehicle assignment, auto-expire
│   │
│   ├── plants/
│   │   ├── PlantList.js        Plant table for admin
│   │   ├── PlantForm.js        Create/edit plant
│   │   └── PlantInchargePortal.js  Plant incharge dashboard (multi-plant)
│   │
│   ├── approvals/
│   │   ├── ApprovalQueue.js    Checker/approver queue with type/status filters
│   │   └── MySubmissions.js    Maker's submissions with review comments
│   │
│   ├── users/
│   │   ├── UserManagement.js   Admin user CRUD, role assignment
│   │   └── UserProfile.js      Self-service profile with edit requests
│   │
│   ├── stoppages/
│   │   └── StoppageList.js     Vehicle stoppage tracking
│   │
│   ├── personal-vehicles/
│   │   └── PersonalVehicleList.js  Superuser personal vehicle management
│   │
│   ├── alerts/
│   │   └── AlertCenter.js      Document expiry alerts, notifications
│   │
│   ├── calendar/
│   │   └── ExpiryCalendar.js   Calendar view of document expiries
│   │
│   ├── reports/
│   │   └── Reports.js          PDF report generation (jsPDF)
│   │
│   └── admin/
│       └── SignupRequests.js   Approve/reject new user signups
│
├── hooks/
│   └── use-toast.js            Toast notification hook
│
├── lib/
│   └── utils.js                cn() classname merger utility
│
└── assets/
    └── truck-loading.json      Lottie animation data
```

---

## User Roles & Permissions

| Role | Can Do |
|------|--------|
| `superuser` | Everything + personal vehicles, delete users |
| `admin` | Manage users, vehicles, drivers, tenders, plants. Bypass approval. |
| `approver` | Final approve/reject checked submissions |
| `checker` | Review pending submissions, forward to approver |
| `operational_manager` | Same as checker |
| `accounts_manager` | View financial data |
| `maker` | Create vehicles/drivers/tenders (goes through approval) |
| `office_incharge` | Same as maker |
| `plant_incharge` | View own plant's vehicles/drivers |
| `records_incharge` | View records |
| `viewer` | Read-only access |
| `driver` | View own profile via driver portal |

---

## Approval Workflow

```
Maker creates vehicle/driver
        |
        v
  [status: pending]
        |
        v
  Checker reviews -----> Reject (back to maker)
        |
        v
  [status: checked]
        |
        v
  Approver decides ----> Reject
        |
        v
  [status: approved]
  Entity becomes active

  * Admin/Superuser bypass: directly active, no approval needed
```

---

## Database Collections (MongoDB)

| Collection | Description |
|------------|-------------|
| `users` | User accounts with roles and auth |
| `vehicles` | Fleet vehicles with documents, assignments, shift_history |
| `drivers` | Driver records with DL, certifications |
| `tenders` | Tender/contract records with assigned vehicles |
| `plants` | Plant/facility records |
| `approvals` | Approval workflow records |
| `documents` | Uploaded document metadata + file URLs |
| `stoppages` | Vehicle downtime records |
| `personal_vehicles` | Personal vehicle records (superuser) |
| `profile_edits` | Profile edit requests pending approval |
| `photos` | User profile photos (base64 in DB) |

---

## Key Data Relationships

- **Vehicle <-> Driver**: `vehicle.assigned_driver_id` / `driver.allocated_vehicle`
- **Vehicle <-> Tender**: `vehicle.tender_name` / `tender.assigned_vehicles[]`
- **Vehicle <-> Plant**: `vehicle.plant` (set via tender or direct edit)
- **Driver <-> Plant**: `driver.plant` (synced from assigned vehicle)
- **Plant <-> Incharge**: `plant.plant_incharge_id` / `user.plant`
- **Approval <-> Entity**: `approval.entity_type` + `approval.entity_id`

---

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
UPLOAD_DIR=uploads
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8000   (or https://sls-fleet-backend.onrender.com)
```
