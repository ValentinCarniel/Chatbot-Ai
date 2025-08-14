from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.db.database import engine
from app.db.models import Base

app = FastAPI(
    title="Chatbot Reclamos",
    description="API para el chatbot de reclamos vecinales",
    version="1.0.0"
)

# Configuración CORS - puedes agregar más orígenes si usas otros puertos o dominios
origins = [
    "http://localhost",
    "http://localhost:5500",
    "http://127.0.0.1",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],        # Permitir todos los métodos HTTP (GET, POST, etc.)
    allow_headers=["*"],        # Permitir todos los encabezados
)

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Incluir rutas con el prefijo /api
app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API del Chatbot Reclamos"}
