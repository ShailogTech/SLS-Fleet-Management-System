# COMPREHENSIVE PRD: FLEET MANAGEMENT SAAS SYSTEM

## SYSTEM IDENTITY & CORE PRINCIPLE
**System Name**: Fleet Master - Transport & Logistics Management Platform  
**Core Design Philosophy**: Build the simplest, most efficient solution that solves real operational problems. Every feature must directly address a pain point. Avoid complexity.

---

## 1. BUSINESS CONTEXT & PROBLEM STATEMENT

### 1.1 Company Profile
- **Industry**: Transport & Logistics (Commercial Vehicle Fleet Operations)
- **Fleet Size**: 260+ commercial vehicles (tankers, trucks, HGVs)
- **Operations**: Multi-plant operations across multiple states (AP, TN, KA, KL, TS, OD)
- **Clients**: Major oil companies (HPCL, BPCL, IOCL, MRPL) and industrial clients
- **Current Pain Points**:
  - Engine number used as unique identifier but inefficient
  - Manual tracking of 40+ different documents per vehicle
  - No centralized visibility across 30+ plant locations
  - Document renewal tracking done manually in Excel
  - No automated alerts for critical renewals (FC, Insurance, Permits)
  - Financial data scattered across multiple systems
  - Driver assignment and tracking is manual
  - No GPS integration for real-time monitoring

### 1.2 Core Problems to Solve
1. **Inefficient Vehicle Identification**: Need structured unique system replacing engine numbers
2. **Document Management Chaos**: 40+ documents per vehicle with varying renewal dates
3. **Missed Renewals**: Critical documents (FC, Insurance, Tax) expire causing vehicle stoppage
4. **No Real-time Visibility**: Plant managers can't see fleet status in real-time
5. **Manual Financial Tracking**: Excel-based P&L, collections, payments
6. **FASTag Reconciliation**: Manual matching of toll transactions with trips
7. **Driver Management**: No system for license tracking, assignment, attendance
8. **Maintenance Planning**: Reactive maintenance due to no predictive tracking

---

## 2. USER PERSONAS & ROLE DEFINITIONS

### 2.1 Management Team (Approver Level)
**Users**: MD (Managing Director) - Sir & Madam, GM (General Manager)
**Primary Goals**: 
- Overall business visibility and control
- Approve major decisions (vehicle assignments, large expenses)
- Monitor profit/loss across all plants
- Strategic planning based on fleet performance

**Key Needs**:
- Dashboard with KPIs (fleet utilization, revenue, expenses, P&L)
- Approval workflows for contracts, purchases, assignments
- Real-time alerts for critical issues
- Financial reports and analytics

**Access Level**: Full system access with approval authority

---

### 2.2 Office Incharge
**Primary Responsibilities**:
- Assign drivers to vehicles
- Manage vehicle allocations to plants/tenders
- Oversee daily operations coordination
- First-level decision maker

**Key Workflows**:
- View available vehicles and drivers
- Assign driver to vehicle with date range
- Reassign vehicles between plants/contracts
- Monitor operational status
- Create stoppage reports

**Access Level**: Full operational access, limited approval authority

---

### 2.3 Plant Incharge (30+ locations)
**Users**: Manimozhi (MRPL HPCL), Prity Dutta (Vizag HP), Thenmozhi (Iliyangudi), Dhivya (Pondy), Saranya (Hubli), etc.

**Primary Responsibilities**:
- Monitor vehicles assigned to their plant
- Track driver attendance and trip details
- Report vehicle stoppages and issues
- Update daily collections
- Coordinate with drivers

**Key Workflows**:
- View plant-assigned vehicles only
- Mark vehicle stoppage with reason
- Record trip details (odometer, fuel, toll)
- Driver attendance marking
- View pending documents for their vehicles

**Access Level**: Viewer + limited edit for their plant only. CANNOT edit master data.

---

### 2.4 Maintenance Incharge (GM Sir)
**Primary Responsibilities**:
- Track vehicle maintenance schedules
- Monitor job cards and service records
- Maintain spare parts inventory
- Ensure timely servicing based on ODO/time
- Coordinate with service centers

**Key Workflows**:
- View maintenance due list
- Create and track job cards
- Update spare parts usage
- Track tyre, battery warranties
- Generate maintenance reports

**Access Level**: Full access to maintenance module

---

### 2.5 Record Incharge (Monisha)
**Primary Responsibilities**:
- Manage ALL vehicle and driver documents
- Track renewal dates for 40+ document types
- Upload and organize documents
- Coordinate FC, Insurance, Permit renewals
- Prepare quotations for renewals

**Key Workflows**:
- Upload documents with metadata (doc type, issue date, expiry date)
- Get alerts 30/15/7 days before expiry
- Prepare renewal lists for approver
- Track renewal status (pending/approved/completed)
- Generate compliance reports

**Access Level**: Full access to document management module

**Critical Document Types to Track**:
- **Vehicle Documents**: RC (Form 23), Tax Receipt (Quarterly), FC (Form 38), Insurance, PUC, Permit, National Permit, CLL (Carrier Legal Liability), Hypothecation, AL Invoice
- **Driver Documents**: Driving License (Transport + Hazardous validity), Badge, Medical Fitness
- **Contract Documents**: LOI/LOA, Tender Documents, SD (Security Deposit), BG (Bank Guarantee), Contract Extensions

---

### 2.6 Toll Incharge (Lavanya)
**Primary Responsibilities**:
- FASTag account management
- Toll transaction reconciliation
- Claim preparation for reimbursement
- Dispute resolution

**Key Workflows**:
- Import FASTag statements (from bank/tag provider)
- Match toll charges with trip details
- Verify vehicle number, date, plaza, amount
- Prepare claims for IOCL, HPCL, BPCL vehicles
- Track claim submission and payment

**Access Level**: Full access to toll/FASTag module

---

### 2.7 Billing Incharge (Muralitharan)
**Primary Responsibilities**:
- Invoice generation based on trips
- Payment followups
- Collection tracking
- Payment adjustments
- Shipment coordination

**Key Workflows**:
- Generate invoices from trip data
- Track invoice status (sent/pending/paid)
- Record payments received
- Bank reconciliation
- Prepare collection reports

**Access Level**: Full access to billing & collections module

---

### 2.8 Diesel Incharge (Paneer)
**Primary Responsibilities**:
- Track diesel purchases and consumption
- Monitor mileage performance
- Bunk payment management
- Diesel expense reconciliation

**Key Workflows**:
- Record diesel fills (date, vehicle, quantity, amount, odometer)
- Calculate mileage (km/liter)
- Alert on mileage drops
- Track bunk outstanding payments
- Share diesel reports with plant managers

**Access Level**: Full access to diesel/fuel module

---

### 2.9 Accounts Team (Rajeev Gandhi, Yogeshwari)
**Primary Responsibilities**:
- Financial data entry and reconciliation
- Tally ERP integration
- Payment processing
- Bank reconciliation
- P&L preparation

**Key Workflows**:
- Daily cash and bank balance updates
- Record payments (fuel, toll, driver salary, vendor bills)
- Bank statement reconciliation
- FASTag balance management
- Generate financial reports
- Driver advance and salary tracking

**Access Level**: Full access to finance module

---

*[Content continues with all 12 modules, technical architecture, implementation roadmap, etc. - the full PRD as provided]*

---

**END OF PRD**
