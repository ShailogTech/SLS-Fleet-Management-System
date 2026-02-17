# FLEET MANAGEMENT SAAS SYSTEM - PRD

## System Identity
**System Name**: SLS Fleet Management System  
**Tech Stack**: React.js (Frontend) + FastAPI (Backend) + MongoDB (Database)  
**Preview URL**: https://tender-alloc.preview.emergentagent.com

---

## What's Been Implemented

### Phase 1 - Core Modules

#### 1. Authentication & Authorization
- JWT-based auth, multi-role RBAC (Superuser, Admin, Maker, Checker, Approver, Driver, Office/Plant/Records Incharge, Viewer)
- Clean login, signup, signup request flow with role assignment
- Role-based routing (Drivers → Driver Portal)

#### 2. Approval Workflow
- **Maker** creates vehicles/drivers → auto-creates approval (status: pending)
- **Checker** reviews → "Verify & Forward to Approver" or "Return to Maker"
- **Approver** gives final verdict → "Approve & Publish" or "Reject"
- **Admin is READ-ONLY** → Can only view + add comments/queries
- Attached documents shown in approval cards with download links

#### 3. Vehicle Creation - Multi-Step Wizard
- Step 1: Vehicle Details → Saves to DB
- Step 2: Upload Documents (RC, Insurance, Fitness, Tax, PUC, Permit, National Permit) with file + expiry
- Step 3: Review & Submit → Redirects to My Submissions

#### 4. Driver Creation - Multi-Step Wizard (NEW Feb 2026)
- Step 1: Driver Details (name, emp_id, phone, DL number, plant)
- Step 2: Upload Documents — **Driving License (DL)** and **Hazardous Certificate** + optional Medical Fitness
- Step 3: Review & Submit → Redirects to My Submissions
- File naming: {emp_id}_{doctype}.{ext}

#### 5. User Profile (NEW Feb 2026)
- **My Profile page** accessible by all roles from sidebar + header
- **Profile photograph upload** — visible to everyone (header, sidebar, driver portal, lists)
- **Edit with approval mechanism** — profile changes (name, phone, emp_id, address, emergency_contact) create approval record
- **Pending edit banner** — shows when a profile edit is waiting for approval
- Photo upload via camera button (JPG, PNG, WEBP, max 10MB)

#### 6. My Submissions
- Users track status of submitted approvals (vehicles, drivers, profile edits)
- Stats cards, status filter, progress timeline

#### 7. Document Management
- Metadata-first flow OR full upload with metadata
- 25MB file size limit, supports PDF, JPG, PNG, DOC, DOCX

#### 8. Driver Portal
- Full-page portal with profile photo, vehicle details, document expiry
- Uploaded document files with download links
- Logout button

#### 9. Other Modules
- Dashboard, Vehicle/Driver Lists, Tender Management (with vehicle allocation)
- Alert Center, Reports, Plants, Stoppages, User Management, Signup Requests

---

## Approval Hierarchy
```
Maker → Creates Vehicle/Driver/Profile Edit (status: pending)
  ↓
Checker → Reviews
  ├── Verify & Forward → status: checked → goes to Approver
  └── Return to Maker → status: rejected
  ↓
Approver → Final review
  ├── Approve & Publish → status: approved → entity activated/changes applied
  └── Reject → status: rejected

Admin → READ-ONLY observer (can add comments/queries only)
```

---

## Key API Endpoints

### Profile (NEW)
- GET /api/users/profile (own profile + pending edit)
- PUT /api/users/profile (submit edit for approval)
- POST /api/users/profile/photo (upload photo)
- GET /api/users/photo/{filename} (serve photo)
- GET /api/users/profile-edits (pending edits for checker/approver)
- POST /api/users/profile-edits/{id}/approve | /reject

### Approvals
- GET /api/approvals/queue | /my-submissions
- POST /api/approvals/{id}/check (Checker ONLY)
- POST /api/approvals/{id}/approve (Approver ONLY)
- POST /api/approvals/{id}/comment (Admin ONLY)

### Documents, Auth, Users, Vehicles, Drivers, Tenders, Dashboard, Driver Portal, Plants, Stoppages

---

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sls.com | admin123 |
| Maker | maker@sls.com | maker123 |
| Checker | checker@sls.com | checker123 |
| Approver | approver@sls.com | approver123 |
| Driver | driver1@sls.com | driver123 |

---

## Upcoming Tasks
1. P1: Vehicle Stoppage Tracking (log/track vehicle stoppages with reasons)
2. Phase 2: Operations & Trips (Trip Entry, Fuel/Diesel, Attendance)
3. Phase 3: Financial Management (FASTag, Invoicing, P&L, Tally Export)
4. Phase 4: Maintenance & GPS Integration
5. Phase 5: Advanced Analytics & Dashboards

## Completed Tasks (Feb 15, 2026)
- ✅ **Tender-Vehicle Allocation**: Full implementation verified
  - List tenders with search/filter
  - Add/Edit tenders with Basic Info, Financial, Vehicles tabs
  - Assign/remove vehicles to/from tenders
  - Stats dashboard showing total vehicles assigned

---

## Architecture
```
/app/
├── backend/
│   ├── server.py
│   ├── models/ (approval, driver, plant, stoppage, tender, user, vehicle)
│   ├── routes/ (auth, vehicles, drivers, tenders, approvals, dashboard, users, documents, driver_portal, plants, stoppages)
│   ├── utils/ (jwt, permissions)
│   └── uploads/ (photos/, documents/)
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── contexts/AuthContext.js
│   │   ├── components/ (navigation/Sidebar, navigation/Header, modals/, documents/DocumentUpload, ui/)
│   │   ├── pages/ (auth/, admin/, alerts/, approvals/, dashboard/, drivers/{DriverList,DriverForm,DriverPortal}, plants/, reports/, stoppages/, tenders/, users/{UserManagement,UserProfile}, vehicles/)
│   │   └── utils/api.js
└── memory/PRD.md
```

---

## Last Updated
February 15, 2026
