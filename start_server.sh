#!/bin/bash

# Script para iniciar el servidor de la aplicación
echo "Iniciando servidor de la aplicación..."

# Activar el entorno virtual
source venv_new/bin/activate

# Verificar que MySQL esté funcionando
echo "Verificando conexión a MySQL..."
if mysql -u root -h 127.0.0.1 -P 3306 -e "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ MySQL está funcionando correctamente"
else
    echo "❌ Error: MySQL no está funcionando. Por favor, inicia MySQL desde XAMPP"
    exit 1
fi

# Iniciar el servidor
echo "🚀 Iniciando servidor en http://localhost:8000"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
