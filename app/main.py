# main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Importación de routers
from app.db.database import Base, engine
from app.api.auth_router import router as auth_router
from app.api.admin_router import router as admin_router
from app.api.routes import router as reclamos_router
from app.api.categorias_router import router as categorias_router
# 👈 tu router de chat se llama routes.py
from app.api.routes import router as chat_router

# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Inicializar la app
app = FastAPI(title="Reclamos Vecinales API")

# ====================
# Middleware CORS
# ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # permite todos los orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================
# Archivos estáticos
# ====================
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

# Montar carpeta Uploads para servir imágenes subidas
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

# ====================
# Rutas principales
# ====================


@app.get("/")
def root():
    return {"ok": True}


@app.get("/admin")
def serve_admin():
    return FileResponse("static/admin.html")


@app.get("/login")
def serve_login():
    return FileResponse("frontend/login.html")


# ====================
# Incluir routers
# ====================
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(reclamos_router, prefix="/reclamos", tags=["reclamos"])
app.include_router(categorias_router, prefix="/admin", tags=["categorias"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
