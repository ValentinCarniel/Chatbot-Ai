// admin.js

const API_URL = "http://127.0.0.1:8000/admin/reclamos";
const STATS_URL = "http://127.0.0.1:8000/admin/stats";
const CATEGORIAS_URL = "http://127.0.0.1:8000/admin/categorias";

const token = localStorage.getItem("token");
if (!token) {
  alert("No estás logueado como admin");
}

let reclamosGlobal = [];
let categoriasGlobal = [];
let categoriaFiltro = "Todos";
let textoFiltro = "";

// ====================
// Fetch Stats
// ====================
async function fetchStats() {
  try {
    const res = await fetch(STATS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats = await res.json();
    document.getElementById("total-reclamos").textContent = stats.total;
    document.getElementById("reclamos-validos").textContent = stats.validos;
    document.getElementById("reclamos-invalidos").textContent = stats.invalidos;
    document.getElementById("categorias-activas").textContent =
      stats.categorias_activas;
  } catch (error) {
    console.error("Error cargando estadísticas:", error);
  }
}

// ====================
// Fetch Reclamos
// ====================
async function fetchReclamos() {
  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reclamos = await res.json();
    reclamosGlobal = reclamos.map((r) => ({
      ...r,
      categoria: r.categoria ? r.categoria.nombre : "Sin Categoría",
    }));
    renderReclamos(aplicarFiltros());
  } catch (error) {
    console.error("Error cargando reclamos:", error);
  }
}

// ====================
// Fetch Categorías
// ====================
async function fetchCategorias() {
  try {
    const res = await fetch(CATEGORIAS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Error al cargar categorías");

    const data = await res.json();
    // data.categorias contiene la lista de categorías
    categoriasGlobal = data.categorias.filter((c) => c.estado === "A");
    renderCategorias();
  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
}

// ====================
// Aplicar filtros combinados
// ====================
function aplicarFiltros() {
  return reclamosGlobal.filter((r) => {
    const categoriaMatch =
      categoriaFiltro === "Todos" ||
      (r.categoria || "Sin Categoría") === categoriaFiltro;
    const textoMatch = r.user_message
      .toLowerCase()
      .includes(textoFiltro.toLowerCase());
    return categoriaMatch && textoMatch;
  });
}

// ====================
// Render Reclamos
// ====================
function renderReclamos(reclamos) {
  const container = document.getElementById("reclamos-container");
  container.innerHTML = "";

  reclamos.forEach((r) => {
    const reclamoDiv = document.createElement("div");
    reclamoDiv.className =
      "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6";

    const fecha = new Date(r.created_at).toLocaleString();

    reclamoDiv.innerHTML = `
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <span class="bg-admin-green text-white px-3 py-1 rounded-full text-sm font-medium">
            ${r.categoria || "Sin Categoría"}
          </span>
          <span class="${
            r.enabled ? "bg-green-500" : "bg-red-500"
          } text-white px-3 py-1 rounded-full text-sm font-medium">
            ${r.enabled ? "Válido" : "Inválido"}
          </span>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <div class="mb-4">
              <h4 class="font-semibold text-gray-800 mb-2">Reclamo del usuario:</h4>
              <p class="text-gray-700 mb-4">${r.user_message}</p>
            </div>
            <div class="mb-4">
              <h4 class="font-semibold text-gray-800 mb-2">Respuesta del sistema:</h4>
              <p class="text-gray-700 mb-4">${r.message || ""}</p>
            </div>
            <div class="flex items-center gap-2 text-gray-500 text-sm">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
              </svg>
              <span>${fecha}</span>
            </div>
          </div>
          <div class="lg:col-span-1">
            <img src="${r.image_path || "/placeholder.svg"}" alt="${
      r.user_message
    }" class="w-full h-48 object-cover rounded-lg border border-gray-200" />
          </div>
        </div>
      </div>
    `;
    container.appendChild(reclamoDiv);
  });
}

// ====================
// Render Categorias
// ====================
function renderCategorias() {
  const container = document.getElementById("categorias-container");
  if (!container) return;

  container.innerHTML = "";
  const categorias = ["Todos", ...categoriasGlobal.map((c) => c.nombre)];

  categorias.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className =
      "bg-admin-green text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-admin-green-dark transition-colors";
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      categoriaFiltro = cat;
      renderReclamos(aplicarFiltros());
    });
    container.appendChild(btn);
  });
}

// ====================
// Filtro de texto
// ====================
const filtroInput = document.getElementById("filtro-reclamos");
if (filtroInput) {
  filtroInput.addEventListener("input", (e) => {
    textoFiltro = e.target.value;
    renderReclamos(aplicarFiltros());
  });
}

// ====================
// Exportar CSV
// ====================
function exportCSV() {
  const rows = [
    ["ID", "Usuario", "Categoría", "Mensaje", "Estado", "Fecha", "Imagen"],
    ...reclamosGlobal.map((r) => [
      r.id,
      `"${r.user_message.replace(/"/g, '""')}"`,
      `"${(r.categoria || "").replace(/"/g, '""')}"`,
      `"${(r.message || "").replace(/"/g, '""')}"`,
      r.enabled ? "Válido" : "Inválido",
      r.created_at,
      r.image_path || "",
    ]),
  ];

  const csvContent =
    "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "reclamos.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ====================
// Asignar evento exportar
// ====================
const exportBtn = document.getElementById("export-btn");
if (exportBtn) exportBtn.addEventListener("click", exportCSV);

// ====================
// Inicialización
// ====================
fetchStats();
fetchCategorias();
fetchReclamos();
