"""FastAPI application factory and health endpoint."""
from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import allocate, alternatives, bundle, condition, forecast, insights, simulate
from app.schemas import HealthResponse

def create_app() -> FastAPI:
    app = FastAPI(
        title="CampusShare AI/ML Service",
        description="Fair deterministic resource allocation and intelligence microservice for CampusShare.",
        version="1.0.0",
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Authentication middleware
    @app.middleware("http")
    async def verify_secret_middleware(request: Request, call_next):
        # Allow health, docs, and openapi without secret
        if request.url.path in ["/", "/health", "/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)

        # Allow OPTIONS for CORS pre-flight
        if request.method == "OPTIONS":
            return await call_next(request)

        # Check secret if configured and not default
        configured_secret = settings.AI_SERVICE_SECRET
        if configured_secret and configured_secret not in ["", "change-me"]:
            secret_header = request.headers.get("x-ai-secret") or request.headers.get("X-AI-Secret")
            auth_header = request.headers.get("authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else ""

            if secret_header != configured_secret and token != configured_secret:
                return Response(
                    content='{"detail": "Unauthorized: Invalid or missing X-AI-Secret header."}',
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    media_type="application/json",
                )

        return await call_next(request)

    # Health check
    @app.get("/health", response_model=HealthResponse)
    @app.get("/", response_model=HealthResponse)
    async def health_check() -> HealthResponse:
        return HealthResponse(
            status="healthy",
            version="1.0.0",
            service="ai-service",
            secretConfigured=bool(settings.AI_SERVICE_SECRET and settings.AI_SERVICE_SECRET != "change-me"),
            llmProvider="gemini" if settings.AI_API_KEY else "deterministic-fallback",
            llmModel=settings.AI_MODEL if settings.AI_API_KEY else "none",
        )

    # Include routers
    app.include_router(allocate.router, tags=["Allocation"])
    app.include_router(alternatives.router, tags=["Alternatives"])
    app.include_router(bundle.router, tags=["Bundle"])
    app.include_router(insights.router, tags=["Insights"])
    app.include_router(condition.router, tags=["Condition"])
    app.include_router(forecast.router, tags=["Forecast"])
    app.include_router(simulate.router, tags=["Simulate"])

    return app

app = create_app()
