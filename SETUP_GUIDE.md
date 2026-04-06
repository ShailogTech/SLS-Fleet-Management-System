# SLTS Fleet Management System

## Developer Setup Guide

This document provides step-by-step instructions for setting up the SLTS Fleet Management System on your local development machine.

The project is split into two separate repositories:

| Repository | Technology | Purpose |
|------------|-----------|---------|
| [slts-fleet-management-backend](https://github.com/ShailogTech/slts-fleet-management-backend) | FastAPI (Python) | REST API Server |
| [slts-fleet-management-frontend](https://github.com/ShailogTech/slts-fleet-management-frontend) | React 18 | Web Application |

---

## 1. Prerequisites

Ensure the following tools are installed on your machine before proceeding.

| Tool | Minimum Version | Download Link |
|------|----------------|---------------|
| Python | 3.10+ | https://www.python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| Git | Latest | https://git-scm.com |

Verify your installations by running:

```bash
python --version
node -v
npm -v
git --version
```

---

## 2. Backend Setup

### 2.1 Clone the Backend Repository

```bash
git clone https://github.com/ShailogTech/slts-fleet-management-backend.git
cd slts-fleet-management-backend
```

### 2.2 Create and Activate a Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.3 Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open the `.env` file and update the following values:

```env
MONGO_URL=<provided by team lead>
DB_NAME=sls_fleet_db
JWT_SECRET_KEY=<provided by team lead>
CORS_ORIGINS=http://localhost:3000
GEMINI_API_KEY=<optional — required only for chatbot feature>
```

> **Important:** Contact your team lead to obtain the MongoDB connection string and JWT secret key. Do not commit the `.env` file to version control.

### 2.5 Whitelist Your IP in MongoDB Atlas

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to **Network Access** under the Security section
3. Click **Add IP Address**
4. Select **Add Current IP Address** or enter `0.0.0.0/0` for development
5. Click **Confirm**

### 2.6 Start the Backend Server

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag enables auto-restart on file changes during development.

### 2.7 Verify the Server

Open a new terminal and run:

```bash
curl http://localhost:8000/api/health
```

Expected response:

```json
{"status": "healthy", "service": "SLTS Fleet Management API"}
```

Interactive API documentation is available at: http://localhost:8000/docs

---

## 3. Frontend Setup

### 3.1 Clone the Frontend Repository

Open a **new terminal window** and run:

```bash
git clone https://github.com/ShailogTech/slts-fleet-management-frontend.git
cd slts-fleet-management-frontend
```

### 3.2 Install Node Dependencies

```bash
npm install --legacy-peer-deps
```

> **Note:** The `--legacy-peer-deps` flag is required due to a known peer dependency conflict with `react-day-picker`. This does not affect functionality.

### 3.3 Configure Environment Variables

Create a `.env` file in the project root:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Windows (Command Prompt):**
```bash
echo REACT_APP_BACKEND_URL=http://localhost:8000 > .env
```

**macOS / Linux:**
```bash
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
```

### 3.4 Start the Frontend Server

```bash
npm start
```

The application will launch automatically at: http://localhost:3000

---

## 4. Accessing the Application

Once both servers are running, open your browser and navigate to:

```
http://localhost:3000/login
```

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@sls.com | *Provided by team lead* |

For additional user accounts (maker, checker, approver, driver, etc.), contact your team lead.

---

## 5. Quick Reference

Once setup is complete, use these commands to start the servers each time:

**Terminal 1 — Backend:**
```bash
cd slts-fleet-management-backend
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd slts-fleet-management-frontend
npm start
```

---

## 6. Troubleshooting

### CORS Error in Browser Console

Ensure the backend `.env` file contains:
```env
CORS_ORIGINS=http://localhost:3000
```
- Do not include a trailing slash
- Restart the backend server after making changes

### npm install Fails

Always use the `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

### Backend Cannot Connect to MongoDB

- Verify the `MONGO_URL` in your `.env` file is correct
- Ensure your IP address is whitelisted in MongoDB Atlas (see Section 2.5)
- Check your internet connection

### Module Not Found Error in Backend

Ensure your virtual environment is activated:
```bash
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

### Frontend Displays a Blank Page

- Open the browser developer console (F12) and check for errors
- Verify `REACT_APP_BACKEND_URL=http://localhost:8000` is set in `frontend/.env`
- Restart the frontend server — React environment variables require a restart to take effect

### Port Already in Use

If port 8000 or 3000 is already in use:

**Backend (change to port 8001):**
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
Then update `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Frontend (automatically uses next available port):**
React will prompt you to use another port if 3000 is occupied. Accept by pressing `Y`.

---

## 7. Project Architecture

```
slts-fleet-management-backend/
├── models/              # Pydantic data models (Vehicle, Driver, Approval, etc.)
├── routes/              # API route handlers
│   ├── auth.py          # Authentication (login, signup, logout)
│   ├── vehicles.py      # Vehicle CRUD + shift operations
│   ├── drivers.py       # Driver CRUD + vehicle assignment
│   ├── approvals.py     # Approval workflow (check, approve, admin bypass)
│   ├── documents.py     # Document upload and retrieval
│   ├── plants.py        # Plant management
│   ├── tenders.py       # Tender management
│   ├── stoppages.py     # Vehicle stoppage tracking
│   ├── dashboard.py     # Dashboard stats and alerts
│   ├── users.py         # User management and profile
│   ├── chatbot.py       # AI chatbot (Gemini)
│   ├── driver_portal.py # Driver self-service portal
│   └── plant_portal.py  # Plant incharge portal
├── utils/               # Utilities (JWT, permissions, timezone helpers)
├── server.py            # Application entry point
├── requirements.txt     # Python dependencies
└── .env.example         # Environment variable template

slts-fleet-management-frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components (buttons, cards, modals)
│   │   ├── common/      # Shared components (StatusBadge, TruckLoader)
│   │   ├── modals/      # Detail modals (Vehicle, Driver)
│   │   ├── navigation/  # Sidebar, Header
│   │   └── ui/          # Radix-based primitives (Button, Input, Select)
│   ├── contexts/        # React context providers (Auth, Refresh)
│   ├── pages/           # Page components organized by feature
│   │   ├── approvals/   # Approval Queue, My Submissions
│   │   ├── auth/        # Login, Signup
│   │   ├── dashboard/   # Dashboard
│   │   ├── drivers/     # Driver management + portal
│   │   ├── vehicles/    # Vehicle management + forms
│   │   ├── plants/      # Plant management
│   │   ├── tenders/     # Tender management
│   │   ├── stoppages/   # Stoppage tracking
│   │   ├── users/       # User management + profile
│   │   ├── alerts/      # Alert center
│   │   ├── calendar/    # Expiry calendar
│   │   └── reports/     # Reports (placeholder)
│   ├── utils/           # API client configuration
│   ├── App.js           # Root component with routing
│   └── index.js         # Application entry point
├── package.json         # Node dependencies
├── craco.config.js      # CRA configuration override
└── tailwind.config.js   # Tailwind CSS configuration
```

---

## 8. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | UI framework |
| Styling | Tailwind CSS | Utility-first CSS |
| UI Components | Radix UI | Accessible component primitives |
| HTTP Client | Axios | API communication |
| Charts | Recharts | Dashboard visualizations |
| Backend | FastAPI | REST API framework |
| ASGI Server | Uvicorn | High-performance Python server |
| Validation | Pydantic v2 | Request/response data validation |
| Database | MongoDB Atlas | Cloud-hosted NoSQL database |
| Authentication | JWT (python-jose) | Token-based authentication |
| Password Hashing | bcrypt (passlib) | Secure password storage |
| AI Chatbot | Google Gemini API | Fleet management assistant |

---

## 9. User Roles

The system implements role-based access control with the following roles:

| Role | Access Level | Description |
|------|-------------|-------------|
| Super Admin | Full access | System administrator, bypasses all approval flows |
| Admin | Full access | Administrative user, bypasses approval flows |
| Approver | Approval actions | Final approval authority |
| Checker | Review actions | First-level review (forwarding/returning submissions) |
| Operational Manager | Review actions | Same privileges as Checker |
| Maker | Create/submit | Creates vehicles, drivers, submits for approval |
| Office Incharge | Create/submit | Creates vehicles, drivers, manages stoppages |
| Plant Incharge | Plant-scoped view | Views vehicles/drivers assigned to their plant |
| Records Incharge | Document access | Manages document uploads |
| Viewer | Read-only | View-only access to fleet data |
| Driver | Self-service | Views own vehicle and documents |

---

*Document maintained by SLTS Fleet Development Team*
*Last updated: April 2026*
