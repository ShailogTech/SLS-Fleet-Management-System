from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

from routes import auth, vehicles, drivers, tenders, approvals, dashboard, users, documents, driver_portal, plants, stoppages, chatbot

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="SLS Fleet Management API", version="1.0.0")

# CORS middleware MUST be added before routes for preflight to work on Vercel
cors_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True if cors_origins != ['*'] else False,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(vehicles.router)
api_router.include_router(drivers.router)
api_router.include_router(tenders.router)
api_router.include_router(approvals.router)
api_router.include_router(dashboard.router)
api_router.include_router(users.router)
api_router.include_router(documents.router)
api_router.include_router(driver_portal.router)
api_router.include_router(plants.router)
api_router.include_router(stoppages.router)
api_router.include_router(chatbot.router)

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SLS Fleet Management API"}

app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    logger.info("Connected to MongoDB")
    
    admin_exists = await db.users.find_one({"role": "superuser"}, {"_id": 0})
    if not admin_exists:
        from utils.jwt import get_password_hash
        from models.user import User
        admin_user = User(
            email="admin@sls.com",
            name="Super Admin",
            phone="9999999999",
            role="superuser",
            status="active"
        )
        admin_doc = admin_user.model_dump()
        admin_doc["password_hash"] = get_password_hash("admin123")
        admin_doc["created_at"] = admin_doc["created_at"].isoformat()
        await db.users.insert_one(admin_doc)
        logger.info("Default admin user created: admin@sls.com / admin123")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
