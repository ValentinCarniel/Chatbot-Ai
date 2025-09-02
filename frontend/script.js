// ====================
// Sistema de Logging
// ====================
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

let currentLogLevel = LOG_LEVELS.DEBUG; // Cambiar a ERROR en producción

const logger = {
  error: (message, data = null) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, data || '');
      // En producción, aquí podrías enviar logs a un servicio
    }
  },
  warn: (message, data = null) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  info: (message, data = null) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.info(`[INFO] ${message}`, data || '');
    }
  },
  debug: (message, data = null) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }
};

// ====================
// Configuración API
// ====================
const API_BASE_URL = "http://127.0.0.1:8000"; // Base del backend FastAPI
const API_CHAT_URL = `${API_BASE_URL}/chat/`;

logger.info('Configuración API iniciada', { API_BASE_URL, API_CHAT_URL });

// ====================
// Variables
// ====================
let aiEnabled = true;
let token = null;

// ====================
// Inicializar token
// ====================
const initializeToken = () => {
  logger.debug('Inicializando token...');
  try {
    token = localStorage.getItem("token");
    const hasToken = !!token;
    logger.info('Token inicializado', { hasToken, tokenLength: token ? token.length : 0 });
    return hasToken;
  } catch (error) {
    logger.error("Error accediendo a localStorage", error);
    return false;
  }
};

// ====================
// Referencias DOM (con verificación)
// ====================
const getElementSafely = (id) => {
  logger.debug(`Buscando elemento DOM: ${id}`);
  const element = document.getElementById(id);
  if (!element) {
    logger.warn(`Elemento con ID '${id}' no encontrado`);
  } else {
    logger.debug(`Elemento '${id}' encontrado exitosamente`);
  }
  return element;
};

const messageInput = getElementSafely("message-input");
const sendButton = getElementSafely("send-button");
const chatMessages = getElementSafely("chat-messages");
const aiToggle = getElementSafely("ai-toggle");
const toggleDot = getElementSafely("toggle-dot");
const statusText = getElementSafely("status-text");
const fileInput = getElementSafely("file-input");

// Verificar elementos críticos
const criticalElements = [
  { element: messageInput, name: 'messageInput' },
  { element: sendButton, name: 'sendButton' },
  { element: chatMessages, name: 'chatMessages' }
];

const missingElements = criticalElements.filter(({ element }) => !element);
if (missingElements.length > 0) {
  const missingNames = missingElements.map(({ name }) => name);
  logger.error("Elementos críticos faltantes. El chat no funcionará correctamente.", missingNames);
} else {
  logger.info("Todos los elementos críticos encontrados correctamente");
}

// Crear contenedor de preview si no existe
let previewContainer = document.getElementById("preview-container");
if (!previewContainer && fileInput && fileInput.parentNode) {
  logger.debug("Creando contenedor de preview");
  previewContainer = document.createElement("div");
  previewContainer.id = "preview-container";
  previewContainer.className = "mt-2 max-w-xs";
  fileInput.parentNode.appendChild(previewContainer);
  logger.info("Contenedor de preview creado exitosamente");
} else if (!previewContainer) {
  logger.warn("No se pudo crear contenedor de preview - fileInput no encontrado");
}

// ====================
// Preview de imagen antes de enviar
// ====================
if (fileInput && previewContainer) {
  logger.info("Configurando event listener para preview de imágenes");
  fileInput.addEventListener("change", (event) => {
    logger.debug("Archivo seleccionado, procesando preview");
    previewContainer.innerHTML = ""; // limpiar preview anterior
    const file = event.target.files[0];
    
    if (file) {
      logger.info("Archivo detectado", { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      });

      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        logger.warn("Tipo de archivo inválido", { type: file.type, validTypes });
        showError("Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP).");
        fileInput.value = "";
        return;
      }

      // Validar tamaño
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        logger.warn("Archivo demasiado grande", { size: file.size, maxSize });
        showError("La imagen es demasiado grande (máximo 5MB).");
        fileInput.value = "";
        return;
      }

      logger.debug("Archivo válido, creando preview");
      const img = document.createElement("img");
      img.className = "max-w-xs rounded border";
      img.alt = "Preview de imagen";
      
      // Crear preview local
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      
      // Limpiar URL cuando la imagen se carga
      img.onload = () => {
        logger.debug("Preview cargado exitosamente");
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onerror = () => {
        logger.error("Error cargando preview de imagen");
        URL.revokeObjectURL(objectUrl);
      };
      
      previewContainer.appendChild(img);
    } else {
      logger.debug("No se seleccionó archivo");
    }
  });
} else {
  logger.warn("No se pudo configurar preview - elementos no encontrados", { 
    fileInput: !!fileInput, 
    previewContainer: !!previewContainer 
  });
}

// ====================
// Funciones Auxiliares
// ====================
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeHtml = (text) => {
  if (typeof text !== 'string') return '';
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const showError = (message) => {
  logger.error("Mostrando error al usuario", { message });
  if (chatMessages) {
    addMessage(`Error: ${message}`, false);
  } else {
    logger.error("No se puede mostrar error en chat - chatMessages no existe");
    console.error(message);
    alert(message);
  }
};

// ====================
// Agregar mensaje al chat
// ====================
const addMessage = (text, isUser = false, categoria = null, imagePath = null) => {
  logger.debug("Agregando mensaje al chat", { 
    textLength: text ? text.length : 0, 
    isUser, 
    categoria, 
    imagePath,
    chatMessagesExists: !!chatMessages 
  });

  if (!chatMessages) {
    logger.error("No se puede agregar mensaje: chatMessages no existe");
    return;
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `flex items-start space-x-3 mb-4 ${isUser ? "justify-end" : ""}`;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = `px-4 py-2 shadow-sm max-w-xs lg:max-w-md rounded-lg ${
    isUser
      ? "bg-blue-500 text-white rounded-tr-none"
      : "bg-white border rounded-tl-none"
  }`;

  // Agregar texto si existe
  if (text && text.trim()) {
    logger.debug("Agregando texto al mensaje");
    const p = document.createElement("p");
    p.className = isUser ? "text-white" : "text-gray-800";
    p.innerHTML = escapeHtml(text).replace(/\n/g, '<br>'); // Preservar saltos de línea
    bubbleDiv.appendChild(p);
  }

  // Agregar imagen si existe
  if (imagePath) {
    logger.debug("Agregando imagen al mensaje", { imagePath });
    const img = document.createElement("img");
    img.alt = "Imagen adjunta";
    img.className = "mt-2 max-w-xs rounded border";
    
    // Manejar diferentes tipos de rutas de imagen
    let finalImageSrc;
    if (imagePath.startsWith("blob:") || imagePath.startsWith("data:")) {
      finalImageSrc = imagePath; // preview local o data URL
      logger.debug("Usando imagen local/blob");
    } else if (imagePath.startsWith("/") || imagePath.startsWith("http")) {
      finalImageSrc = imagePath.startsWith("http") ? imagePath : `${API_BASE_URL}${imagePath}`;
      logger.debug("Usando imagen del servidor", { finalImageSrc });
    } else {
      finalImageSrc = `${API_BASE_URL}/${imagePath}`;
      logger.debug("Construyendo URL de imagen", { finalImageSrc });
    }
    
    img.src = finalImageSrc;
    
    // Manejar errores de carga de imagen
    img.onerror = () => {
      logger.error("Error cargando imagen en mensaje", { src: finalImageSrc });
      img.style.display = "none";
      const errorText = document.createElement("p");
      errorText.className = "text-red-500 text-xs mt-1";
      errorText.textContent = "Error cargando imagen";
      bubbleDiv.appendChild(errorText);
    };
    
    img.onload = () => {
      logger.debug("Imagen cargada exitosamente en mensaje");
    };
    
    bubbleDiv.appendChild(img);
  }

  // Agregar categoría si existe y no es usuario
  if (categoria && !isUser) {
    logger.debug("Agregando categoría al mensaje", { categoria });
    const catSpan = document.createElement("span");
    catSpan.className = "text-xs text-blue-600 font-medium mt-2 block";
    catSpan.textContent = `Categoría: ${escapeHtml(categoria)}`;
    bubbleDiv.appendChild(catSpan);
  }

  // Agregar timestamp
  const timeSpan = document.createElement("span");
  timeSpan.className = isUser
    ? "text-xs text-blue-200 mt-1 block text-right"
    : "text-xs text-gray-500 mt-1 block";
  timeSpan.textContent = getCurrentTime();
  bubbleDiv.appendChild(timeSpan);

  // Crear icono
  const iconDiv = document.createElement("div");
  iconDiv.className = `w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
    isUser ? "bg-blue-500 order-2 ml-3" : "bg-green-500"
  }`;

  iconDiv.innerHTML = isUser
    ? `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
               d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
       </svg>`
    : `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
         <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.35L2 22l5.65-1.05C9.96 21.64 
                 11.46 22 13 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
       </svg>`;

  if (isUser) {
    messageDiv.appendChild(bubbleDiv);
    messageDiv.appendChild(iconDiv);
  } else {
    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(bubbleDiv);
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  logger.info("Mensaje agregado exitosamente al chat");
};

// ====================
// Enviar mensaje
// ====================
const sendMessage = async (e) => {
  if (e) e.preventDefault();
  
  logger.info("Iniciando envío de mensaje");

  if (!messageInput || !chatMessages) {
    logger.error("Elementos necesarios no encontrados", { 
      messageInput: !!messageInput, 
      chatMessages: !!chatMessages 
    });
    return;
  }

  const message = messageInput.value.trim();
  const file = fileInput ? fileInput.files[0] : null;
  
  logger.debug("Datos del mensaje", { 
    messageLength: message.length, 
    hasFile: !!file,
    fileName: file ? file.name : null,
    fileSize: file ? file.size : null
  });
  
  if (!message && !file) {
    logger.warn("Intento de envío sin contenido");
    showError("Debes escribir un mensaje o adjuntar una imagen.");
    return;
  }

  if (!token) {
    logger.error("Intento de envío sin token de autenticación");
    showError("No estás autenticado. Por favor, inicia sesión.");
    return;
  }

  // Deshabilitar botón mientras se envía
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = "Enviando...";
    logger.debug("Botón de envío deshabilitado");
  }

  try {
    // Mostrar mensaje del usuario
    const userImageUrl = file ? URL.createObjectURL(file) : null;
    logger.debug("Mostrando mensaje del usuario", { userImageUrl: !!userImageUrl });
    addMessage(message, true, null, userImageUrl);
    
    // NO limpiar inputs aquí - esperar a que la respuesta sea exitosa

    if (!aiEnabled) {
      logger.info("IA deshabilitada, mostrando mensaje informativo");
      addMessage("El asistente IA está deshabilitado. Actívalo para continuar.", false);
      // Solo limpiar inputs si la IA está deshabilitada
      if (messageInput) messageInput.value = "";
      if (fileInput) fileInput.value = "";
      if (previewContainer) previewContainer.innerHTML = "";
      return;
    }

    // Preparar FormData
    logger.debug("Preparando datos para envío");
    const formData = new FormData();
    if (message) formData.append("user_message", message);
    formData.append("enabled", aiEnabled.toString());
    if (file) formData.append("file", file);

    // Log de headers para debugging
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    logger.debug("Headers de la petición", { 
      hasAuth: !!headers.Authorization,
      tokenLength: token.length 
    });

    // Realizar petición
    logger.info("Enviando petición a API", { url: API_CHAT_URL });
    const startTime = performance.now();
    
    const response = await fetch(API_CHAT_URL, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    const endTime = performance.now();
    logger.info("Respuesta recibida", { 
      status: response.status, 
      statusText: response.statusText,
      duration: `${(endTime - startTime).toFixed(2)}ms`
    });

    let data;
    const contentType = response.headers.get("content-type");
    logger.debug("Tipo de contenido de respuesta", { contentType });
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
      logger.debug("Datos JSON recibidos", { 
        hasMessage: !!data.message,
        hasCategoria: !!data.categoria,
        hasImagePath: !!data.image_path
      });
    } else {
      const textResponse = await response.text();
      logger.warn("Respuesta no JSON recibida", { textResponse: textResponse.substring(0, 200) });
      data = { detail: `Respuesta inesperada del servidor: ${textResponse}` };
    }

    if (!response.ok) {
      const errorMessage = data.detail || data.message || `Error ${response.status}: ${response.statusText}`;
      logger.error("Error en respuesta del servidor", { 
        status: response.status, 
        errorMessage 
      });
      showError(errorMessage);
      // NO limpiar inputs en caso de error - mantener el contenido para que el usuario pueda reintentar
      return;
    }

    // Mostrar respuesta del asistente
    logger.info("Mostrando respuesta del asistente");
    addMessage(
      data.message || "Respuesta vacía del servidor", 
      false, 
      data.categoria || null, 
      data.image_path || null
    );

    // Solo limpiar inputs cuando el envío sea exitoso
    logger.debug("Envío exitoso, limpiando inputs");
    if (messageInput) messageInput.value = "";
    if (fileInput) fileInput.value = "";
    if (previewContainer) previewContainer.innerHTML = "";

  } catch (error) {
    logger.error("Error durante el envío de mensaje", { 
      name: error.name, 
      message: error.message,
      stack: error.stack
    });
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showError("No se pudo conectar con el servidor. Verifica tu conexión.");
    } else if (error.name === 'AbortError') {
      showError("La petición fue cancelada.");
    } else {
      showError("Ocurrió un error inesperado al enviar el mensaje.");
    }
    // NO limpiar inputs en caso de error - mantener el contenido para que el usuario pueda reintentar
  } finally {
    // Solo restaurar el botón, NO limpiar inputs aquí
    logger.debug("Restaurando botón de envío");
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = "Enviar";
    }
    
    logger.info("Envío de mensaje completado");
  }
};

// ====================
// Toggle IA
// ====================
if (aiToggle && toggleDot && statusText) {
  logger.info("Configurando toggle de IA");
  aiToggle.addEventListener("click", () => {
    const previousState = aiEnabled;
    aiEnabled = !aiEnabled;
    
    logger.info("Estado de IA cambiado", { 
      previousState, 
      newState: aiEnabled 
    });
    
    toggleDot.classList.toggle("translate-x-6", aiEnabled);
    toggleDot.classList.toggle("translate-x-1", !aiEnabled);
    aiToggle.classList.toggle("bg-green-500", aiEnabled);
    aiToggle.classList.toggle("bg-gray-300", !aiEnabled);
    statusText.textContent = aiEnabled ? "Activado" : "Desactivado";
    
    // Feedback visual adicional
    statusText.className = aiEnabled ? "text-green-600" : "text-gray-600";
    
    logger.debug("UI del toggle actualizada");
  });
} else {
  logger.warn("No se pudo configurar toggle de IA - elementos no encontrados", {
    aiToggle: !!aiToggle,
    toggleDot: !!toggleDot,
    statusText: !!statusText
  });
}

// ====================
// Eventos
// ====================
if (sendButton) {
  logger.debug("Configurando event listener para botón de envío");
  sendButton.addEventListener("click", sendMessage);
} else {
  logger.warn("No se pudo configurar botón de envío - elemento no encontrado");
}

if (messageInput) {
  logger.debug("Configurando event listener para input de mensaje");
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      logger.debug("Enter presionado, enviando mensaje");
      e.preventDefault();
      sendMessage(e);
    } else if (e.key === "Enter" && e.shiftKey) {
      logger.debug("Shift+Enter presionado, nueva línea");
    }
  });
} else {
  logger.warn("No se pudo configurar input de mensaje - elemento no encontrado");
}

// ====================
// Función para cargar historial de reclamos
// ====================
const cargarHistorialReclamos = async () => {
  logger.info("Cargando historial de reclamos...");
  
  try {
    const response = await fetch(`${API_BASE_URL}/chat/historial`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    logger.info("Historial cargado exitosamente", { reclamosCount: data.reclamos?.length || 0 });
    
    if (data.reclamos && data.reclamos.length > 0) {
      addMessage(`Se cargaron ${data.reclamos.length} reclamos anteriores.`, false);
      data.reclamos.forEach((reclamo, index) => {
        addMessage(reclamo.user_message, true, {
          categoria: reclamo.categoria,
          timestamp: reclamo.created_at,
          imagePath: reclamo.image_path
        });
        addMessage(reclamo.message, false, {
          categoria: reclamo.categoria,
          timestamp: reclamo.created_at
        });
      });
    } else {
      addMessage("No hay reclamos anteriores. ¡Comienza enviando tu primer mensaje!", false);
    }
    
  } catch (error) {
    logger.error("Error cargando historial de reclamos", error);
    addMessage("Error cargando historial de reclamos. Intenta recargar la página.", false);
  }
};

// ====================
// Función para cerrar sesión
// ====================
const cerrarSesion = () => {
  logger.info("Cerrando sesión...");
  
  try {
    // Limpiar localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    
    // Limpiar variables
    token = null;
    
    // Mostrar mensaje de confirmación
    addMessage("Sesión cerrada exitosamente. Redirigiendo al login...", false);
    
    // Redirigir al login después de un breve delay
    setTimeout(() => {
      window.location.href = "/frontend/login.html";
    }, 1500);
    
    logger.info("Sesión cerrada y redirección iniciada");
    
  } catch (error) {
    logger.error("Error al cerrar sesión", error);
    addMessage("Error al cerrar sesión. Intenta recargar la página.", false);
  }
};

// ====================
// Inicialización
// ====================
document.addEventListener("DOMContentLoaded", () => {
  logger.info("DOM cargado, iniciando aplicación");
  
  const hasToken = initializeToken();
  
  // Configurar botón de cerrar sesión
  const cerrarBtn = getElementSafely("cerrar-btn");
  if (cerrarBtn) {
    cerrarBtn.addEventListener("click", cerrarSesion);
    logger.info("Botón de cerrar sesión configurado");
  } else {
    logger.warn("Botón de cerrar sesión no encontrado");
  }
  
  if (!hasToken) {
    logger.warn("Usuario no autenticado");
    addMessage("No estás logueado. Debes iniciar sesión para usar el chat.", false);
    if (sendButton) {
      sendButton.disabled = true;
      sendButton.textContent = "Inicia sesión";
      logger.debug("Botón de envío deshabilitado por falta de autenticación");
    }
    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = "Inicia sesión para chatear";
      logger.debug("Input de mensaje deshabilitado por falta de autenticación");
    }
  } else {
    logger.info("Usuario autenticado, chat listo");
    addMessage("¡Bienvenido al chat! El asistente IA está listo para ayudarte.", false);
    cargarHistorialReclamos(); // Cargar historial al iniciar sesión
  }
  
  // Verificar configuración final
  logger.info("Estado de inicialización", {
    hasToken,
    aiEnabled,
    elementsFound: {
      messageInput: !!messageInput,
      sendButton: !!sendButton,
      chatMessages: !!chatMessages,
      fileInput: !!fileInput,
      aiToggle: !!aiToggle,
      previewContainer: !!previewContainer,
      cerrarBtn: !!cerrarBtn
    }
  });
});

// ====================
// Manejo de errores globales
// ====================
window.addEventListener('error', (e) => {
  logger.error('Error global capturado', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: e.error
  });
});

window.addEventListener('unhandledrejection', (e) => {
  logger.error('Promesa rechazada no manejada', {
    reason: e.reason,
    stack: e.reason?.stack
  });
  
  // Evitar que aparezca en consola si ya lo registramos
  e.preventDefault();
});

// ====================
// Función para cambiar nivel de log
// ====================
window.setLogLevel = (level) => {
  const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
  if (levelName) {
    currentLogLevel = level;
    logger.info(`Nivel de log cambiado a: ${levelName}`);
  } else {
    logger.error('Nivel de log inválido', { level });
  }
};

// Mostrar información de debugging en consola
logger.info("Script cargado correctamente", {
  version: "1.0.0",
  logLevel: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel),
  timestamp: new Date().toISOString()
});