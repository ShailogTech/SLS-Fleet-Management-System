"""
Seed MongoDB from fleet_data.csv — vehicles, drivers, users, plants, tenders.
Usage: python seed_from_csv.py "mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority" sls_fleet
"""

import csv
import re
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pymongo import MongoClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

VALID_COPN = {"HPC", "IOC", "BPC"}
COPN_TO_CLIENT = {"HPC": "HPCL", "IOC": "IOCL", "BPC": "BPCL"}


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
    """Clean money values like ' 2,92,500 ' -> '292500'."""
    if not val:
        return None
    val = str(val).strip().replace(" ", "").replace(",", "").replace('"', '')
    return val if val and val != "0" else None


def main():
    if len(sys.argv) < 2:
        print('Usage: python seed_from_csv.py "<MONGO_URL>"')
        sys.exit(1)

    mongo_url = sys.argv[1]
    db_name = "sls_fleet_db"

    print("Connecting to MongoDB...")
    client = MongoClient(mongo_url, tlsAllowInvalidCertificates=True)
    db = client[db_name]
    db.command("ping")
    print("Connected!\n")

    csv_path = Path(__file__).parent / "fleet_data.csv"
    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    total_rows = len(rows)
    print(f"CSV rows: {total_rows}")

    # ═══════════════════════════════════════════════════════
    #  Pass 1: Collect unique plants and tenders
    # ═══════════════════════════════════════════════════════
    plant_map = {}       # plant_name -> plant doc
    tender_map = {}      # tender_no -> tender doc
    tender_vehicles = {} # tender_no -> list of vehicle_nos

    for row in rows:
        # Plants
        plant_name = clean(row.get("PLANT"))
        copn = clean(row.get("COPN"))
        if plant_name and plant_name not in plant_map:
            # Derive city from plant name (remove suffixes like HP, HPC, IOC, BPC)
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
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        # Tenders
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
                client = COPN_TO_CLIENT.get(copn, copn) if copn in VALID_COPN else (copn or "")
                extension = parse_bool(row.get("Extension"))

                # Derive contract_type from tender_name
                contract_type = ""
                for ct in ["SLGC", "SLTS MP", "SLTS", "SLGS", "SVTS", "SGC", "SLGA"]:
                    if ct in (tender_name or "").upper():
                        contract_type = ct
                        break

                # end_date = contract_validity, start_date = 3 years before (estimate)
                end_date = contract_validity or "2026-12-31"
                try:
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                    start_dt = end_dt - timedelta(days=3*365)
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
                    "client": client,
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
                    "assigned_vehicles": [],  # filled below
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }

    # Assign vehicles to tenders
    for tno, veh_list in tender_vehicles.items():
        if tno in tender_map:
            tender_map[tno]["assigned_vehicles"] = list(set(veh_list))

    plants = list(plant_map.values())
    tenders = list(tender_map.values())

    # ═══════════════════════════════════════════════════════
    #  Pass 2: Build vehicles, drivers, users
    # ═══════════════════════════════════════════════════════
    vehicles = []
    drivers = []
    users = []
    used_emails = set()
    used_emails.add("admin@sls.com")
    skipped = []

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
        now = datetime.now(timezone.utc).isoformat()

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
            "submitted_by": "csv_import",
            "created_at": now,
            "updated_at": now,
        })

        # ── User account ──
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
            "created_at": now,
        })

        # ── Vehicle ──
        documents = {}
        for csv_col, doc_key in [
            ("VEH EXPY", "rc_expiry"), ("FC", "fitness_expiry"),
            ("TAX", "tax_expiry"), ("INS", "insurance_expiry"),
            ("PUC", "puc_expiry"), ("permit", "permit_expiry"),
            ("NP", "national_permit_expiry"),
        ]:
            d = parse_date(row.get(csv_col))
            if d:
                documents[doc_key] = d

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
            "documents": documents or None,
            "status": "active",
            "submitted_by": "csv_import",
            "created_at": now,
            "updated_at": now,
        })

    # ═══════════════════════════════════════════════════════
    #  Validate
    # ═══════════════════════════════════════════════════════
    print(f"\nBuilt:")
    print(f"  Vehicles:  {len(vehicles)}")
    print(f"  Drivers:   {len(drivers)}")
    print(f"  Users:     {len(users)}")
    print(f"  Plants:    {len(plants)}")
    print(f"  Tenders:   {len(tenders)}")
    if skipped:
        print(f"  Skipped:   {len(skipped)}")
        for s in skipped:
            print(f"    - {s}")

    assert len(vehicles) == len(drivers) == len(users), "Vehicle/Driver/User count mismatch!"

    # ═══════════════════════════════════════════════════════
    #  Insert into MongoDB
    # ═══════════════════════════════════════════════════════
    print("\nClearing old data (keeping admin user)...")
    db.vehicles.delete_many({})
    db.drivers.delete_many({})
    db.users.delete_many({"role": "driver"})
    db.plants.delete_many({})
    db.tenders.delete_many({})

    db.vehicles.insert_many(vehicles)
    print(f"  Inserted {len(vehicles)} vehicles")

    db.drivers.insert_many(drivers)
    print(f"  Inserted {len(drivers)} drivers")

    db.users.insert_many(users)
    print(f"  Inserted {len(users)} users")

    db.plants.insert_many(plants)
    print(f"  Inserted {len(plants)} plants")

    db.tenders.insert_many(tenders)
    print(f"  Inserted {len(tenders)} tenders")

    # ═══════════════════════════════════════════════════════
    #  Verify from DB
    # ═══════════════════════════════════════════════════════
    print(f"\n{'='*45}")
    print(f"  FINAL DB COUNTS:")
    print(f"  Vehicles:      {db.vehicles.count_documents({})}")
    print(f"  Drivers:       {db.drivers.count_documents({})}")
    print(f"  Driver users:  {db.users.count_documents({'role': 'driver'})}")
    print(f"  Total users:   {db.users.count_documents({})}")
    print(f"  Plants:        {db.plants.count_documents({})}")
    print(f"  Tenders:       {db.tenders.count_documents({})}")
    print(f"{'='*45}")

    all_ok = (
        db.vehicles.count_documents({}) == len(vehicles)
        and db.drivers.count_documents({}) == len(drivers)
        and db.users.count_documents({"role": "driver"}) == len(users)
        and db.plants.count_documents({}) == len(plants)
        and db.tenders.count_documents({}) == len(tenders)
    )
    print(f"  {'ALL COUNTS MATCH!' if all_ok else 'ERROR: COUNTS MISMATCH'}")

    print(f"\nSample driver logins:")
    for u in users[:5]:
        nk = u["name"].lower().replace(" ", "")
        print(f"  {u['email']} / {nk}123")
    print(f"  admin@sls.com / admin123")
    print("\nDone!")
    client.close()


if __name__ == "__main__":
    main()
