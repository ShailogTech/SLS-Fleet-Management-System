# SLS Fleet Management System - User Credentials

## System Access Credentials

### Admin & Management Roles
- **Super Admin**
  - Email: admin@sls.com  
  - Password: admin123
  - Access: Full system access, user management, all modules

- **Office Incharge**
  - Email: office@sls.com
  - Password: office123
  - Access: Vehicle/Driver assignment, operational tasks

- **Records Incharge**
  - Email: records@sls.com
  - Password: records123
  - Access: Document management, renewals, RTO coordination

- **Plant Manager**
  - Email: plant@sls.com
  - Password: plant123
  - Access: View plant-specific data (MYSORE HP)

### Workflow Roles
- **Maker** (Data Entry)
  - Email: maker@sls.com
  - Password: maker123
  - Access: Create vehicles, drivers, tenders

- **Checker** (Verification)
  - Email: checker@sls.com
  - Password: checker123
  - Access: Verify and check submitted data

- **Approver** (Final Approval)
  - Email: approver@sls.com
  - Password: approver123
  - Access: Final approval of checked data

### Driver Access
- **Driver 1 - Raghu N**
  - Email: driver1@sls.com
  - Password: driver123
  - Emp ID: DRV001
  - Phone: 8744455006
  - Allocated Vehicle: AP39TE0828

- **Driver 2 - Manoj Y**
  - Email: driver2@sls.com
  - Password: driver123
  - Emp ID: DRV002
  - Phone: 9448516225
  - Allocated Vehicle: AP39UP2532

- **Driver 3 - Hari G**
  - Email: driver3@sls.com
  - Password: driver123
  - Emp ID: DRV003
  - Phone: 9372879809
  - Allocated Vehicle: AP39VE9854

## System Statistics
- **Total Vehicles**: 268 (imported from fleet master data)
- **Total Drivers**: 201 (imported from vehicle data)
- **Active Plants**: MYSORE HP, ANANTHAPUR HPC, HUBLI, KORATHA, MYSORE IOC, etc.
- **Owners**: MSK, SPK, SSK, JPK

## Role-Based Features

### SuperUser/Admin Features:
- Dashboard with all metrics
- Vehicles management (CRUD)
- Drivers management (CRUD)
- Tenders management (CRUD)
- Approval queue (all statuses)
- Document alerts
- Reports
- User management

### Maker Features:
- Create vehicles
- Create drivers
- Create tenders
- View own submissions

### Checker Features:
- View pending submissions
- Verify data
- Approve or reject to maker
- Forward to approver

### Approver Features:
- View checked submissions
- Final approval
- Reject back to maker

### Driver Features:
- View own profile
- View allocated vehicle details
- View vehicle documents
- View document expiry alerts

### Office Incharge Features:
- Assign drivers to vehicles
- Create/edit vehicles and drivers
- View all operational data

### Records Incharge Features:
- Manage documents
- Track document expiries
- Coordinate renewals

### Plant Incharge Features:
- View plant-specific vehicles and drivers
- Monitor plant operations
