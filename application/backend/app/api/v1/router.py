from fastapi import APIRouter
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.projects import router as projects_router
from app.api.v1.routes.styles import router as styles_router
from app.api.v1.routes.recommendations import router as recommendations_router
from app.api.v1.routes.search import router as search_router

api_router = APIRouter()

# Include all routers
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(projects_router, tags=["room_projects"])
api_router.include_router(styles_router, tags=["styles"])
api_router.include_router(recommendations_router, tags=["recommendations"])
api_router.include_router(search_router, tags=["search"])
