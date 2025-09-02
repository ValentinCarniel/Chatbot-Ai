# app/api/chat_router.py
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Reclamo, Categoria
from app.services.security import get_current_user
from openai import OpenAI
from dotenv import load_dotenv
import os
import base64
import re
import uuid
import time

# cargar variables de entorno
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

router = APIRouter(tags=["chat"])
client = OpenAI(api_key=OPENAI_API_KEY)

# ====================
# Configuración de Uploads
# ====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ====================
# Categorías predefinidas
# ====================
CATEGORIAS_PREDEFINIDAS = [
    "Baches y Pavimento",
    "Alumbrado Público",
    "Semáforos",
    "Contenedores de Basura",
    "Limpieza Urbana",
    "Aceras y Veredas",
    "Alcantarillas y Desagües",
    "Parques y Espacios Verdes",
    "Transporte Público",
    "Señales de Tránsito",
    "Otros Servicios"
]

PALABRAS_PROHIBIDAS = [
    "puta", "puto", "forro", "pelotudo", "concha", "pija", "coger",
    "mierda", "boludo", "gil", "tarado", "idiota", "imbecil", "estupido"
]

# ====================
# Funciones Auxiliares
# ====================


def contiene_groserias(mensaje: str) -> bool:
    mensaje = mensaje.lower()
    for palabra in PALABRAS_PROHIBIDAS:
        if re.search(rf'\b{re.escape(palabra)}\b', mensaje):
            return True
    return False


def inicializar_categorias(db: Session):
    for nombre in CATEGORIAS_PREDEFINIDAS:
        if not db.query(Categoria).filter(Categoria.nombre == nombre).first():
            db.add(Categoria(nombre=nombre, estado="A"))
    db.commit()


def categorizar_reclamo(user_message: str) -> str:
    msg = user_message.lower()
    categorias = {
        'Baches y Pavimento': ['bache', 'baches', 'pavimento', 'asfalto', 'calle rota', 'camino roto', 'pavimento roto', 'asfalto roto'],
        'Alumbrado Público': ['luz', 'luzes', 'alumbrado', 'poste', 'postes', 'farol', 'faroles', 'iluminación', 'lámpara', 'lámparas'],
        'Semáforos': ['semáforo', 'semáforos', 'semaforo', 'semaforos', 'traffic light', 'luz de tránsito'],
        'Contenedores de Basura': ['contenedor', 'contenedores', 'basura', 'tacho', 'tachos', 'residuos', 'basurero'],
        'Limpieza Urbana': ['limpieza', 'sucio', 'basura', 'papel', 'desechos', 'barrido', 'limpiar'],
        'Aceras y Veredas': ['acera', 'aceras', 'vereda', 'veredas', 'banqueta', 'banquetas', 'peatonal'],
        'Alcantarillas y Desagües': ['alcantarilla', 'alcantarillas', 'desagüe', 'desagües', 'cloaca', 'cloacas', 'drenaje'],
        'Parques y Espacios Verdes': ['parque', 'parques', 'plaza', 'plazas', 'jardín', 'jardines', 'área verde', 'espacio verde'],
        'Transporte Público': ['colectivo', 'colectivos', 'bus', 'buses', 'parada', 'paradas', 'transporte'],
        'Señales de Tránsito': ['señal', 'señales', 'cartel', 'carteles', 'señalización', 'stop', 'ceda el paso'],
        'Otros Servicios': ['agua', 'gas', 'electricidad', 'internet', 'wifi', 'servicio']
    }
    for categoria, palabras in categorias.items():
        for palabra in palabras:
            if palabra in msg:
                return categoria
    if 'calle' in msg or 'avenida' in msg:
        return 'Baches y Pavimento'
    if 'luz' in msg or 'oscuro' in msg:
        return 'Alumbrado Público'
    if 'tránsito' in msg or 'cruce' in msg:
        return 'Semáforos'
    return 'Otros Servicios'


def contiene_direccion(mensaje: str) -> bool:
    patron = r"[A-Za-zÁÉÍÓÚáéíóúñÑ]+\s+\d{1,5}"
    return re.search(patron, mensaje) is not None

# ====================
# Endpoint Chat
# ====================


@router.post("/")
async def chat_with_ai(
    user_message: str = Form(...),
    file: UploadFile = File(None),
    enabled: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    enabled_bool = enabled.lower() in ["true", "1", "yes"]

    # validaciones iniciales
    if contiene_groserias(user_message):
        raise HTTPException(
            status_code=400, detail="El reclamo contiene lenguaje inapropiado.")
    if not contiene_direccion(user_message):
        raise HTTPException(
            status_code=400, detail="El reclamo debe contener una dirección válida (ej: calle y número).")

    inicializar_categorias(db)
    categoria_nombre = categorizar_reclamo(user_message)
    categoria = db.query(Categoria).filter(
        Categoria.nombre == categoria_nombre).first()
    if not categoria:
        raise HTTPException(
            status_code=500, detail="Error cargando categorías.")

    # manejo de imagen
    image_path = None
    ai_image_response = None
    if file and getattr(file, "filename", None):
        if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
            raise HTTPException(
                status_code=400, detail="Solo se permiten imágenes JPG o PNG.")
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="Imagen demasiado grande (máx 5MB).")

        unique_filename = f"{uuid.uuid4().hex}_{int(time.time())}.{file.filename.split('.')[-1]}"
        file_location = os.path.join(UPLOAD_DIR, unique_filename)
        with open(file_location, "wb") as f:
            f.write(contents)

        # ruta pública para frontend
        image_path = f"/uploads/{unique_filename}"

        # análisis con IA usando gpt-4o-mini (texto + imagen)
        try:
            prompt_text = "Analiza esta imagen y determina si muestra un problema vecinal o de servicios públicos que requiere ser reportado.\nResponde con 'VÁLIDA' o 'NO VÁLIDA: [razón]'."
            response_img = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt_text},
                            {"type": "image_url", "image_url": {
                                "url": f"data:{file.content_type};base64,{base64.b64encode(contents).decode()}"}}
                        ]
                    }
                ],
                temperature=0.0,
            )
            ai_image_response = response_img.choices[0].message.content.strip()
            if not ai_image_response.lower().startswith("válida"):
                raise HTTPException(
                    status_code=400, detail=f"Imagen no válida según IA: {ai_image_response}")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error procesando la imagen: {e}")

    # validación final del reclamo con IA
    try:
        prompt_reclamo = f"""
        Eres un bot que valida reclamos vecinales y de servicios públicos.
        Mensaje del usuario: {user_message}
        {'Imagen adjunta' if image_path else 'Sin imagen adjunta'}
        Responde:
        - 'Reclamo válido y registrado' si cumple las condiciones.
        - 'Reclamo no válido' si no cumple, explicando brevemente por qué.
        """
        response_ai = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system",
                    "content": "Eres un asistente de validación de reclamos vecinales."},
                {"role": "user", "content": prompt_reclamo}
            ],
            temperature=0.3,
        )
        ai_message = response_ai.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error en validación IA: {e}")

    # guardar en DB
    reclamo = Reclamo(
        user_id=current_user.id,
        user_message=user_message,
        message=ai_message,
        enabled=enabled_bool,
        image_path=image_path,
        categoria_id=categoria.id,
    )
    db.add(reclamo)
    db.commit()
    db.refresh(reclamo)

    return {
        "id": reclamo.id,
        "user_message": reclamo.user_message,
        "message": reclamo.message,
        "enabled": reclamo.enabled,
        "image_path": reclamo.image_path,
        "categoria": categoria.nombre,
        "categoria_id": reclamo.categoria_id,
        "created_at": reclamo.created_at,
        "user_id": reclamo.user_id,
        "ai_image_response": ai_image_response
    }


@router.get("/historial")
async def obtener_historial_reclamos(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Obtener historial de reclamos del usuario"""
    try:
        reclamos = db.query(Reclamo).filter(
            Reclamo.user_id == current_user.id
        ).order_by(Reclamo.created_at.desc()).all()
        
        historial = []
        for reclamo in reclamos:
            categoria = db.query(Categoria).filter(
                Categoria.id == reclamo.categoria_id
            ).first()
            
            historial.append({
                "id": reclamo.id,
                "user_message": reclamo.user_message,
                "message": reclamo.message,
                "enabled": reclamo.enabled,
                "image_path": reclamo.image_path,
                "categoria": categoria.nombre if categoria else "Sin categoría",
                "created_at": reclamo.created_at.isoformat() if reclamo.created_at else None,
            })
        
        return {"reclamos": historial}
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error obteniendo historial: {e}")
