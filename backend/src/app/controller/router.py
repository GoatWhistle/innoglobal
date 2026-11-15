from fastapi import APIRouter

from app.controller.assistant.router import router as assistant_router
from app.controller.health.router import router as health_router
from app.controller.pipes.router import router as pipes_router
from app.controller.reference.router import router as reference_router

api_router_v1 = APIRouter(prefix="/api/v1")
api_router_v1.include_router(health_router)
api_router_v1.include_router(pipes_router)
api_router_v1.include_router(reference_router)
api_router_v1.include_router(assistant_router)
