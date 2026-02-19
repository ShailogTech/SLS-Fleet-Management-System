from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import certifi
from pathlib import Path

from routes import auth, vehicles, drivers, tenders, approvals, dashboard, users, documents, driver_portal, plants, stoppages, chatbot

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]


async def seed_admin():
    """Seed default admin user if none exists. Runs in background."""
    try:
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
    except Exception as e:
        logger.error(f"Failed to seed admin user: {e}")


@asynccontextmanager
async def lifespan(app):
    logger.info("Starting up — connected to MongoDB")
    asyncio.create_task(seed_admin())
    yield
    client.close()
    logger.info("Shutdown — MongoDB connection closed")


app = FastAPI(title="SLS Fleet Management API", version="1.0.0", lifespan=lifespan)

# ---------------------------------------------------------------------------
# CORS configuration
# ---------------------------------------------------------------------------
# CORS_ORIGINS should be a comma-separated list of allowed origins, e.g.
#   https://fleet-management-eight-gilt.vercel.app,https://other-domain.com
# A wildcard "*" is supported for quick local dev but credentials will still
# work because we explicitly list it. For production always list exact origins.
# ---------------------------------------------------------------------------
raw_origins = os.environ.get('CORS_ORIGINS', '*')
cors_origins = [o.strip().rstrip('/') for o in raw_origins.split(',') if o.strip()]
logger.info(f"CORS allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — ensures CORS headers are present even on 500s
# Without this, a 500 error response may lack the Access-Control-Allow-Origin
# header, causing the browser to report a CORS error instead of the real error.
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}")
    origin = request.headers.get("origin", "")
    headers = {}
    if origin and (origin in cors_origins or "*" in cors_origins):
        headers["Access-Control-Allow-Origin"] = origin if "*" not in cors_origins else "*"
        headers["Access-Control-Allow-Credentials"] = "true"

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {type(exc).__name__}: {str(exc)}"},
        headers=headers,
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
