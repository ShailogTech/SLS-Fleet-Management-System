from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import certifi
from pathlib import Path

from routes import auth, vehicles, drivers, tenders, approvals, dashboard, users, documents, driver_portal, plant_portal, plants, stoppages, chatbot, personal_vehicles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
logger.info(f"Connecting to MongoDB (host masked)")
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ.get('DB_NAME', 'sls_fleet_db')]


async def seed_admin():
    """Seed default admin user if none exists. Runs in background."""
    try:
        admin_exists = await db.users.find_one({"role": "superuser"}, {"_id": 0})
        if not admin_exists:
            from utils.jwt import get_password_hash
            from models.user import User
            admin_password = os.environ.get("ADMIN_DEFAULT_PASSWORD", "Dstzr2FwjtK0ntSa")
            admin_user = User(
                email="admin@sls.com",
                name="Super Admin",
                phone="9999999999",
                role="superuser",
                status="active"
            )
            admin_doc = admin_user.model_dump()
            admin_doc["password_hash"] = get_password_hash(admin_password)
            admin_doc["created_at"] = admin_doc["created_at"].isoformat()
            await db.users.insert_one(admin_doc)
            logger.info("Default admin user created")
    except Exception as e:
        logger.error(f"Failed to seed admin user: {e}")


@asynccontextmanager
async def lifespan(app):
    logger.info("Starting up — connected to MongoDB")
    asyncio.create_task(seed_admin())
    # Ensure unique index on engine_no
    try:
        await db.vehicles.drop_index("engine_no_1")
    except Exception:
        pass
    await db.vehicles.update_many({"engine_no": None}, {"$unset": {"engine_no": ""}})
    await db.vehicles.create_index("engine_no", unique=True, sparse=True)
    yield
    client.close()
    logger.info("Shutdown — MongoDB connection closed")


app = FastAPI(title="SLTS Fleet Management API", version="1.0.0", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# ---------------------------------------------------------------------------
# CORS configuration
# ---------------------------------------------------------------------------
raw_origins = os.environ.get('CORS_ORIGINS', 'https://slts.group,http://localhost:3000,https://sls-fleet-management-system.vercel.app')
if raw_origins.strip() == '*':
    cors_origins = ["*"]
else:
    cors_origins = [o.strip().rstrip('/') for o in raw_origins.split(',') if o.strip()]
logger.info(f"CORS allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — ensures CORS headers are present even on 500s
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}")
    origin = request.headers.get("origin", "")
    if "*" in cors_origins:
        allow_origin = "*"
    else:
        allow_origin = origin if origin in cors_origins else cors_origins[0] if cors_origins else ""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers={
            "Access-Control-Allow-Origin": allow_origin,
        },
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
api_router.include_router(plant_portal.router)
api_router.include_router(plants.router)
api_router.include_router(stoppages.router)
api_router.include_router(chatbot.router)
api_router.include_router(personal_vehicles.router)

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SLTS Fleet Management API"}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
