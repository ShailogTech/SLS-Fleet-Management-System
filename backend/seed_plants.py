import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from models.plant import Plant
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

plants_data = [
    {"plant_name": "MYSORE HP", "plant_type": "HPCL", "city": "Mysore", "state": "Karnataka", "contact_phone": "9876543210"},
    {"plant_name": "ANANTHAPUR HPC", "plant_type": "HPCL", "city": "Ananthapur", "state": "Andhra Pradesh", "contact_phone": "9876543211"},
    {"plant_name": "HUBLI", "plant_type": "IOCL", "city": "Hubli", "state": "Karnataka", "contact_phone": "9876543212"},
    {"plant_name": "KORATHA", "plant_type": "BPCL", "city": "Koratha", "state": "Karnataka", "contact_phone": "9876543213"},
    {"plant_name": "MYSORE IOC", "plant_type": "IOCL", "city": "Mysore", "state": "Karnataka", "contact_phone": "9876543214"},
    {"plant_name": "MRPL HPCL", "plant_type": "HPCL", "city": "Mangalore", "state": "Karnataka", "contact_phone": "9876543215"},
    {"plant_name": "MRPL BPC", "plant_type": "BPCL", "city": "Mangalore", "state": "Karnataka", "contact_phone": "9876543216"},
    {"plant_name": "VIZAG HP", "plant_type": "HPCL", "city": "Visakhapatnam", "state": "Andhra Pradesh", "contact_phone": "9876543217"},
    {"plant_name": "PONDY", "plant_type": "IOCL", "city": "Puducherry", "state": "Puducherry", "contact_phone": "9876543218"},
    {"plant_name": "ILIYANGUDI", "plant_type": "IOCL", "city": "Iliyangudi", "state": "Tamil Nadu", "contact_phone": "9876543219"},
]

async def seed_plants():
    print("Seeding plants...")
    
    existing_count = await db.plants.count_documents({})
    if existing_count > 0:
        print(f"[WARN]  {existing_count} plants already exist. Skipping seed.")
        return
    
    for plant_data in plants_data:
        plant = Plant(**plant_data)
        plant_doc = plant.model_dump()
        plant_doc["created_at"] = plant_doc["created_at"].isoformat()
        plant_doc["updated_at"] = plant_doc["updated_at"].isoformat()
        await db.plants.insert_one(plant_doc)
        print(f" Created plant: {plant_data['plant_name']}")
    
    print(f"\n[OK] Successfully created {len(plants_data)} plants")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_plants())
