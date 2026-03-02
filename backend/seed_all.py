"""
Full seed script — loads fleet_data.csv into MongoDB Atlas.
Populates: vehicles, drivers, users, plants, tenders, approvals, documents.

Usage:
  python seed_all.py                          # reads MONGO_URL from .env
  python seed_all.py "mongodb+srv://..."      # explicit connection string
"""

import csv
import os
import re
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pymongo import MongoClient
from passlib.context import CryptContext

# Try loading .env for convenience
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

VALID_COPN = {"HPC", "IOC", "BPC"}
COPN_TO_CLIENT = {"HPC": "HPCL", "IOC": "IOCL", "BPC": "BPCL"}

DOC_CSV_MAP = [
    ("VEH EXPY", "rc_expiry", "rc", "Registration Certificate"),
    ("FC", "fitness_expiry", "fitness", "Fitness Certificate"),
    ("TAX", "tax_expiry", "tax", "Tax Receipt"),
    ("INS", "insurance_expiry", "insurance", "Insurance"),
    ("PUC", "puc_expiry", "puc", "PUC Certificate"),
    ("permit", "permit_expiry", "permit", "Permit"),
    ("NP", "national_permit_expiry", "national_permit", "National Permit"),
]

ROLE_USERS = [
    {"email": "admin@sls.com",      "name": "Super Admin",       "phone": "9999999999", "role": "superuser",           "password": "admin123",    "emp_id": "ADMIN-001"},
    {"email": "maker@sls.com",      "name": "John Maker",        "phone": "9876543210", "role": "maker",               "password": "maker123",    "emp_id": "MKR-001"},
    {"email": "checker@sls.com",    "name": "Sarah Checker",     "phone": "9876543211", "role": "checker",             "password": "checker123",  "emp_id": "CHK-001"},
    {"email": "approver@sls.com",   "name": "Mike Approver",     "phone": "9876543212", "role": "approver",            "password": "approver123", "emp_id": "APR-001"},
    {"email": "office@sls.com",     "name": "Office Incharge",   "phone": "9876543213", "role": "office_incharge",     "password": "office123",   "emp_id": "OFC-001"},
    {"email": "records@sls.com",    "name": "Monisha Records",   "phone": "9876543214", "role": "records_incharge",    "password": "records123",  "emp_id": "REC-001"},
    {"email": "opsmanager@sls.com", "name": "Ops Manager",       "phone": "9876543216", "role": "operational_manager", "password": "ops123",      "emp_id": "OPS-001"},
    {"email": "acmanager@sls.com",  "name": "Accounts Manager",  "phone": "9876543217", "role": "accounts_manager",    "password": "accounts123", "emp_id": "ACC-001"},
]


# ─── Helpers ───────────────────────────────────────────────

def parse_date(val):
    if not val or val.strip().lower() in ("", "no", "n/a", "-", "nil"):
        return None
    val = val.strip()
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def parse_bool(val):
    if not val:
        return False
    return val.strip().lower() in ("y", "yes", "true", "1")


def clean(val):
    if val is None:
        return None
    val = str(val).strip()
    return val if val and val.lower() not in ("", "nil", "n/a", "-") else None


def clean_finance(val):
    if val is None:
        return None
    val = str(val).strip()
    return None if val.lower() in ("", "0", "nil", "n/a", "-") else val


def clean_money(val):
    if not val:
        return None
    val = str(val).strip().replace(" ", "").replace(",", "").replace('"', '')
    return val if val and val != "0" else None


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ─── Main ──────────────────────────────────────────────────

def main():
    # Resolve connection string
    if len(sys.argv) >= 2:
        mongo_url = sys.argv[1]
    else:
        mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print('Usage: python seed_all.py "<MONGO_URL>"')
        print("   or: set MONGO_URL in .env file")
        sys.exit(1)

    db_name = os.environ.get("DB_NAME", "sls_fleet_db")

    print(f"Connecting to MongoDB ({db_name})...")
    client = MongoClient(mongo_url, tlsAllowInvalidCertificates=True)
    db = client[db_name]
    db.command("ping")
    print("Connected!\n")

    csv_path = Path(__file__).parent / "fleet_data.csv"
    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found")
        sys.exit(1)

    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    total_rows = len(rows)
    print(f"CSV rows: {total_rows}")

    # ═══════════════════════════════════════════════════════
    #  Pass 1: Collect unique plants and tenders
    # ═══════════════════════════════════════════════════════
    plant_map = {}
    tender_map = {}
    tender_vehicles = {}

    for row in rows:
        plant_name = clean(row.get("PLANT"))
        copn = clean(row.get("COPN"))
        if plant_name and plant_name not in plant_map:
            city = plant_name
            for suffix in [" HPC", " HP", " IOC", " BPC", " HPCL", " BPCL"]:
                if city.upper().endswith(suffix):
                    city = city[:-len(suffix)].strip()
                    break

            plant_type = COPN_TO_CLIENT.get(copn, copn) if copn in VALID_COPN else "Other"
            plant_map[plant_name] = {
                "id": str(uuid.uuid4()),
                "plant_name": plant_name,
                "plant_type": plant_type,
                "city": city,
                "state": "India",
                "contact_phone": None,
                "contact_email": None,
                "plant_incharge_id": None,
                "is_active": True,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }

        tender_no = clean(row.get("TENDER NO"))
        vehicle_no = clean(row.get("VEHICLE NO"))
        if tender_no:
            if tender_no not in tender_vehicles:
                tender_vehicles[tender_no] = []
            if vehicle_no:
                tender_vehicles[tender_no].append(vehicle_no)

            if tender_no not in tender_map:
                tender_name = clean(row.get("concern")) or ""
                contract_validity = parse_date(row.get("CONTRACT VALIDITY"))
                tender_loc = clean(row.get("TENDER")) or ""
                client_name = COPN_TO_CLIENT.get(copn, copn) if copn in VALID_COPN else (copn or "")
                extension = parse_bool(row.get("Extension"))

                contract_type = ""
                for ct in ["SLGC", "SLTS MP", "SLTS", "SLGS", "SVTS", "SGC", "SLGA"]:
                    if ct in (tender_name or "").upper():
                        contract_type = ct
                        break

                end_date = contract_validity or "2026-12-31"
                try:
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                    start_dt = end_dt - timedelta(days=3 * 365)
                    start_date = start_dt.strftime("%Y-%m-%d")
                except ValueError:
                    start_date = "2023-01-01"

                sd_number = clean(row.get("SD NUMBER"))
                sd_value = clean_money(row.get(" SD VALUE ")) or clean_money(row.get("SD VALUE"))
                bg_number = clean(row.get("BG NUMBER"))
                bg_value = clean_money(row.get(" BG VALUE ")) or clean_money(row.get("BG VALUE"))
                bank = clean(row.get("BANK"))

                tender_map[tender_no] = {
                    "id": str(uuid.uuid4()),
                    "tender_name": tender_name,
                    "tender_no": tender_no,
                    "client": client_name,
                    "start_date": start_date,
                    "end_date": end_date,
                    "contract_validity": contract_validity,
                    "plant": tender_loc,
                    "contract_type": contract_type,
                    "sd_number": sd_number,
                    "sd_value": sd_value,
                    "sd_bank": bank,
                    "bg_number": bg_number,
                    "bg_value": bg_value,
                    "bg_bank": bank,
                    "extension_granted": extension,
                    "extension_end_date": None,
                    "status": "active",
                    "assigned_vehicles": [],
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                }

    for tno, veh_list in tender_vehicles.items():
        if tno in tender_map:
            tender_map[tno]["assigned_vehicles"] = list(set(veh_list))

    plants = list(plant_map.values())
    tenders = list(tender_map.values())

    # ═══════════════════════════════════════════════════════
    #  Pass 2: Build vehicles, drivers, users, approvals, documents
    # ═══════════════════════════════════════════════════════
    vehicles = []
    drivers = []
    users = []
    approvals = []
    documents = []
    used_emails = set()
    for ru in ROLE_USERS:
        used_emails.add(ru["email"])

    # ── Dynamic plant_incharge users (one per unique plant) ──
    plant_incharge_users = []
    for idx, plant_name in enumerate(sorted(plant_map.keys()), start=1):
        name_key = re.sub(r'[^a-z0-9]', '', plant_name.lower())
        email = f"{name_key}@sls.com"
        # Handle email collision
        counter = 1
        while email in used_emails:
            email = f"{name_key}{counter}@sls.com"
            counter += 1
        used_emails.add(email)
        password = f"{name_key}123"
        plant_incharge_users.append({
            "email": email,
            "name": f"Plant Incharge - {plant_name}",
            "phone": f"98765{40000 + idx}",
            "role": "plant_incharge",
            "password": password,
            "emp_id": f"PLT-{idx:03d}",
            "plant": plant_name,
        })

    skipped = []

    # A single "csv_import" submitter ID for all seeded data
    submitter_id = "csv_import"

    for idx, row in enumerate(rows, start=2):
        vehicle_no = clean(row.get("VEHICLE NO"))
        driver_name = clean(row.get("DRIVER"))

        if not vehicle_no:
            skipped.append(f"Row {idx}: empty vehicle number")
            continue
        if not driver_name:
            skipped.append(f"Row {idx} ({vehicle_no}): empty driver name")
            continue

        vehicle_id = str(uuid.uuid4())
        driver_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        now = now_iso()

        # ── Driver ──
        driver_phone = clean(row.get("Driver phone number")) or ""
        dl_no = clean(row.get("DL NO")) or ""
        dl_digits = re.sub(r'\D', '', dl_no)
        emp_id = f"EMP-{dl_digits[-6:]}" if len(dl_digits) >= 6 else f"EMP-{dl_digits or vehicle_no.replace(' ', '')}"

        drivers.append({
            "id": driver_id,
            "name": driver_name,
            "emp_id": emp_id,
            "phone": driver_phone,
            "alternate_phone": None,
            "email": None,
            "dl_no": dl_no,
            "dl_expiry": parse_date(row.get("licence validity")),
            "hazardous_cert_expiry": parse_date(row.get("HAZARDOUS VALIDITY")),
            "plant": clean(row.get("PLANT")),
            "allocated_vehicle": vehicle_no,
            "status": "active",
            "submitted_by": submitter_id,
            "created_at": now,
            "updated_at": now,
        })

        # ── User account for driver ──
        name_key = driver_name.lower().replace(" ", "")
        email = f"{name_key}@sls.com"
        counter = 1
        while email in used_emails:
            email = f"{name_key}{counter}@sls.com"
            counter += 1
        used_emails.add(email)

        users.append({
            "id": user_id,
            "email": email,
            "password_hash": pwd_context.hash(f"{name_key}123"),
            "name": driver_name,
            "role": "driver",
            "phone": driver_phone,
            "emp_id": emp_id,
            "status": "active",
            "photo_url": None,
            "created_at": now,
        })

        # ── Vehicle ──
        veh_documents = {}
        for csv_col, doc_key, _, _ in DOC_CSV_MAP:
            d = parse_date(row.get(csv_col))
            if d:
                veh_documents[doc_key] = d

        vehicles.append({
            "id": vehicle_id,
            "vehicle_no": vehicle_no,
            "owner_name": clean(row.get("NAME OF THE OWNER")) or "",
            "capacity": clean(row.get("CAPACITY")),
            "reg_date": parse_date(row.get("REG-DATE")),
            "make": clean(row.get("MAKE")) or "",
            "chassis_no": clean(row.get("CHASIS NO")),
            "engine_no": clean(row.get("ENG-NO")),
            "rto": clean(row.get("RTO")),
            "plant": clean(row.get("PLANT")),
            "tender": clean(row.get("TENDER")),
            "tender_no": clean(row.get("TENDER NO")),
            "tender_name": clean(row.get("concern")),
            "manager": clean(row.get("MANAGER")),
            "hypothecation": parse_bool(row.get("HYOP")),
            "finance_company": clean_finance(row.get("FINANCE")),
            "phone": clean(row.get("PHONE NO")),
            "vehicle_type": clean(row.get("CAPACITY")),
            "assigned_driver_id": driver_id,
            "assigned_driver_name": driver_name,
            "documents": veh_documents or {},
            "status": "active",
            "submitted_by": submitter_id,
            "created_at": now,
            "updated_at": now,
        })

        # ── Approval record (marked as fully approved) ──
        approval_id = str(uuid.uuid4())
        approvals.append({
            "id": approval_id,
            "entity_type": "vehicle",
            "entity_id": vehicle_id,
            "submitted_by": submitter_id,
            "status": "approved",
            "checker_id": submitter_id,
            "checker_comment": "Seeded from CSV — auto-verified",
            "checker_action_at": now,
            "approver_id": submitter_id,
            "approver_comment": "Seeded from CSV — auto-approved",
            "approver_action_at": now,
            "admin_comments": [],
            "created_at": now,
            "updated_at": now,
        })

        # ── Document metadata records (one per document type with expiry) ──
        for csv_col, doc_key, doc_type, doc_label in DOC_CSV_MAP:
            expiry = parse_date(row.get(csv_col))
            if expiry:
                doc_id = str(uuid.uuid4())
                documents.append({
                    "id": doc_id,
                    "entity_type": "vehicle",
                    "entity_id": vehicle_id,
                    "document_type": doc_type,
                    "document_number": None,
                    "issue_date": None,
                    "expiry_date": expiry,
                    "issuing_authority": None,
                    "filename": None,
                    "file_path": None,
                    "file_url": None,
                    "file_content_b64": None,
                    "file_content_type": None,
                    "uploaded_by": submitter_id,
                    "created_at": now,
                    "updated_at": now,
                    "status": "metadata_only",
                })

        # ── Driver document records (DL + Hazardous) ──
        dl_expiry = parse_date(row.get("licence validity"))
        if dl_expiry:
            documents.append({
                "id": str(uuid.uuid4()),
                "entity_type": "driver",
                "entity_id": driver_id,
                "document_type": "dl",
                "document_number": dl_no,
                "issue_date": None,
                "expiry_date": dl_expiry,
                "issuing_authority": None,
                "filename": None,
                "file_path": None,
                "file_url": None,
                "file_content_b64": None,
                "file_content_type": None,
                "uploaded_by": submitter_id,
                "created_at": now,
                "updated_at": now,
                "status": "metadata_only",
            })

        hz_expiry = parse_date(row.get("HAZARDOUS VALIDITY"))
        if hz_expiry:
            documents.append({
                "id": str(uuid.uuid4()),
                "entity_type": "driver",
                "entity_id": driver_id,
                "document_type": "hazardous",
                "document_number": None,
                "issue_date": None,
                "expiry_date": hz_expiry,
                "issuing_authority": None,
                "filename": None,
                "file_path": None,
                "file_url": None,
                "file_content_b64": None,
                "file_content_type": None,
                "uploaded_by": submitter_id,
                "created_at": now,
                "updated_at": now,
                "status": "metadata_only",
            })

    # ── Role-based users (admin, maker, checker, approver, etc.) ──
    role_user_docs = []
    for ru in ROLE_USERS + plant_incharge_users:
        role_user_docs.append({
            "id": str(uuid.uuid4()),
            "email": ru["email"],
            "password_hash": pwd_context.hash(ru["password"]),
            "name": ru["name"],
            "role": ru["role"],
            "phone": ru.get("phone", ""),
            "emp_id": ru.get("emp_id", ""),
            "plant": ru.get("plant"),
            "status": "active",
            "photo_url": None,
            "created_at": now_iso(),
        })

    # ═══════════════════════════════════════════════════════
    #  Validate
    # ═══════════════════════════════════════════════════════
    print(f"\nBuilt:")
    print(f"  Vehicles:   {len(vehicles)}")
    print(f"  Drivers:    {len(drivers)}")
    print(f"  Users:      {len(users)} drivers + {len(role_user_docs)} role users")
    print(f"  Plants:     {len(plants)}")
    print(f"  Tenders:    {len(tenders)}")
    print(f"  Approvals:  {len(approvals)}")
    print(f"  Documents:  {len(documents)}")
    if skipped:
        print(f"  Skipped:    {len(skipped)}")
        for s in skipped:
            print(f"    - {s}")

    assert len(vehicles) == len(drivers) == len(users), "Vehicle/Driver/User count mismatch!"

    # ═══════════════════════════════════════════════════════
    #  Insert into MongoDB (clears ALL collections first)
    # ═══════════════════════════════════════════════════════
    print("\nClearing all collections...")
    for coll in ["vehicles", "drivers", "users", "plants", "tenders", "approvals", "documents", "profile_edits", "signup_requests", "photos"]:
        db[coll].delete_many({})
        print(f"  Cleared {coll}")

    # Drop unique index on engine_no (CSV has duplicates)
    try:
        db.vehicles.drop_index("engine_no_1")
        print("  Dropped engine_no unique index")
    except Exception:
        pass

    # Insert role-based users first
    db.users.insert_many(role_user_docs)
    print(f"\n  Inserted {len(role_user_docs)} role users:")
    for ru in ROLE_USERS:
        print(f"    {ru['email']:25s} / {ru['password']:15s} ({ru['role']})")

    if vehicles:
        db.vehicles.insert_many(vehicles)
    print(f"  Inserted {len(vehicles)} vehicles")

    if drivers:
        db.drivers.insert_many(drivers)
    print(f"  Inserted {len(drivers)} drivers")

    if users:
        db.users.insert_many(users)
    print(f"  Inserted {len(users)} driver users")

    if plants:
        db.plants.insert_many(plants)
    print(f"  Inserted {len(plants)} plants")

    if tenders:
        db.tenders.insert_many(tenders)
    print(f"  Inserted {len(tenders)} tenders")

    if approvals:
        db.approvals.insert_many(approvals)
    print(f"  Inserted {len(approvals)} approvals")

    if documents:
        db.documents.insert_many(documents)
    print(f"  Inserted {len(documents)} documents")

    # ═══════════════════════════════════════════════════════
    #  Verify
    # ═══════════════════════════════════════════════════════
    print(f"\n{'='*50}")
    print(f"  FINAL DB COUNTS:")
    for coll in ["vehicles", "drivers", "users", "plants", "tenders", "approvals", "documents", "profile_edits", "signup_requests", "photos"]:
        count = db[coll].count_documents({})
        print(f"  {coll:20s} {count}")
    print(f"{'='*50}")

    total_users = db.users.count_documents({})
    expected_users = len(users) + len(role_user_docs)  # drivers + role users
    all_ok = (
        db.vehicles.count_documents({}) == len(vehicles)
        and db.drivers.count_documents({}) == len(drivers)
        and total_users == expected_users
        and db.plants.count_documents({}) == len(plants)
        and db.tenders.count_documents({}) == len(tenders)
        and db.approvals.count_documents({}) == len(approvals)
        and db.documents.count_documents({}) == len(documents)
    )
    print(f"  {'ALL COUNTS MATCH!' if all_ok else 'ERROR: COUNTS MISMATCH'}")

    print(f"\nRole-based logins:")
    for ru in ROLE_USERS:
        print(f"  {ru['email']:25s} / {ru['password']}")
    print(f"\nPlant Incharge logins ({len(plant_incharge_users)}):")
    for pu in plant_incharge_users:
        print(f"  {pu['email']:35s} / {pu['password']:25s} → {pu['plant']}")
    print(f"\nSample driver logins:")
    for u in users[:5]:
        nk = u["name"].lower().replace(" ", "")
        print(f"  {u['email']:25s} / {nk}123")
    print("\nDone!")
    client.close()


if __name__ == "__main__":
    main()
