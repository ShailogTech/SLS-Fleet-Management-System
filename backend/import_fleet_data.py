import asyncio
import csv
from motor.motor_asyncio import AsyncIOMotorClient
from models.vehicle import Vehicle
from models.driver import Driver
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def parse_date(date_str):
    if not date_str or date_str.strip() == '':
        return None
    try:
        return datetime.strptime(date_str, '%d-%m-%Y').date().isoformat()
    except:
        try:
            return datetime.strptime(date_str, '%d/%m/%Y').date().isoformat()
        except:
            return None

async def import_vehicles():
    print("Importing vehicles from Fleet Master Data...")
    
    csv_path = str(ROOT_DIR / 'fleet_data.csv')
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        return
    
    await db.vehicles.delete_many({})
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        count = 0
        for row in reader:
            try:
                vehicle_doc = {
                    "id": str(uuid.uuid4()),
                    "vehicle_no": row.get('VEHICLE NO', '').strip(),
                    "owner_name": row.get('NAME OF THE OWNER', '').strip(),
                    "capacity": row.get('CAPACITY', '').strip(),
                    "reg_date": parse_date(row.get('REG-DATE', '')),
                    "make": row.get('MAKE', '').strip(),
                    "chassis_no": row.get('CHASIS NO', '').strip(),
                    "engine_no": row.get('ENG-NO', '').strip(),
                    "rto": row.get('RTO', '').strip(),
                    "plant": row.get('PLANT', '').strip(),
                    "tender": row.get('TENDER', '').strip(),
                    "tender_no": row.get('TENDER NO', '').strip(),
                    "manager": row.get('MANAGER', '').strip(),
                    "hypothecation": row.get('HYOP', '').strip().lower() == 'y',
                    "finance_company": row.get('FINANCE', '').strip(),
                    "phone": row.get('PHONE NO', '').strip(),
                    "driver_name": row.get('DRIVER', '').strip(),
                    "driver_phone": row.get('Driver phone number', '').strip(),
                    "status": "active",
                    "documents": {
                        "rc_expiry": parse_date(row.get('VEH EXPY', '')),
                        "insurance_expiry": parse_date(row.get('INS', '')),
                        "fitness_expiry": parse_date(row.get('FC', '')),
                        "tax_expiry": parse_date(row.get('TAX', '')),
                        "puc_expiry": parse_date(row.get('PUC', '')),
                        "permit_expiry": parse_date(row.get('permit', '')),
                        "national_permit_expiry": parse_date(row.get('NP', '')),
                    },
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                if vehicle_doc['vehicle_no']:
                    await db.vehicles.insert_one(vehicle_doc)
                    count += 1
                    if count % 10 == 0:
                        print(f"Imported {count} vehicles...")
            except Exception as e:
                print(f"Error importing vehicle {row.get('VEHICLE NO', 'UNKNOWN')}: {str(e)}")
    
    print(f"\n[OK] Successfully imported {count} vehicles")

async def import_drivers():
    print("\nImporting drivers from vehicle data...")
    
    await db.drivers.delete_many({})
    
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    
    driver_map = {}
    for vehicle in vehicles:
        driver_name = vehicle.get('driver_name', '').strip()
        driver_phone = vehicle.get('driver_phone', '').strip()
        
        if driver_name and driver_phone and driver_name not in driver_map:
            driver_map[driver_name] = {
                "id": str(uuid.uuid4()),
                "name": driver_name,
                "emp_id": f"DRV{len(driver_map) + 1:03d}",
                "phone": driver_phone,
                "dl_no": f"KA{len(driver_map) + 1:02d} 2022 {8000000 + len(driver_map)}",
                "dl_expiry": "2030-12-31",
                "hazardous_cert_expiry": "2027-06-30",
                "plant": vehicle.get('plant', ''),
                "status": "active",
                "allocated_vehicle": vehicle.get('vehicle_no', ''),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
    
    for driver_doc in driver_map.values():
        await db.drivers.insert_one(driver_doc)
    
    print(f"[OK] Successfully imported {len(driver_map)} drivers")

async def main():
    await import_vehicles()
    await import_drivers()
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
