import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from models.user import User
from utils.jwt import get_password_hash
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

users_data = [
    {"email": "admin@sls.com", "name": "Super Admin", "phone": "9999999999", "role": "superuser", "password": "admin123"},
    {"email": "maker@sls.com", "name": "John Maker", "phone": "9876543210", "role": "maker", "password": "maker123"},
    {"email": "checker@sls.com", "name": "Sarah Checker", "phone": "9876543211", "role": "checker", "password": "checker123"},
    {"email": "approver@sls.com", "name": "Mike Approver", "phone": "9876543212", "role": "approver", "password": "approver123"},
    {"email": "driver1@sls.com", "name": "Raghu N", "phone": "8744455006", "role": "driver", "password": "driver123", "emp_id": "DRV001"},
    {"email": "driver2@sls.com", "name": "Manoj Y", "phone": "9448516225", "role": "driver", "password": "driver123", "emp_id": "DRV002"},
    {"email": "driver3@sls.com", "name": "Hari G", "phone": "9372879809", "role": "driver", "password": "driver123", "emp_id": "DRV003"},
    {"email": "office@sls.com", "name": "Office Incharge", "phone": "9876543213", "role": "office_incharge", "password": "office123"},
    {"email": "records@sls.com", "name": "Monisha Records", "phone": "9876543214", "role": "records_incharge", "password": "records123"},
    {"email": "plant@sls.com", "name": "Plant Manager", "phone": "9876543215", "role": "plant_incharge", "password": "plant123", "plant": "MYSORE HP"},
    {"email": "opsmanager@sls.com", "name": "Ops Manager", "phone": "9876543216", "role": "operational_manager", "password": "ops123"},
    {"email": "acmanager@sls.com", "name": "Accounts Manager", "phone": "9876543217", "role": "accounts_manager", "password": "accounts123"},
]

async def seed_users():
    print("Seeding users...")
    await db.users.delete_many({})
    
    for user_data in users_data:
        password = user_data.pop("password")
        user = User(**user_data)
        user_doc = user.model_dump()
        user_doc["password_hash"] = get_password_hash(password)
        user_doc["created_at"] = user_doc["created_at"].isoformat()
        await db.users.insert_one(user_doc)
        print(f"  Created user: {user_data['email']} ({user_data['role']})")
    
    print(f"\nSuccessfully created {len(users_data)} users")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_users())
