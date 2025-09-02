// cerrarsesion.js
document.addEventListener("DOMContentLoaded", () => {
  const cerrarBtn = document.getElementById("cerrar-btn");

  if (cerrarBtn) {
    cerrarBtn.addEventListener("click", () => {
      // Borrar token y rol
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      sessionStorage.removeItem("token");

      // Redirigir al login
      window.location.href = "/frontend/login.html";
    });
  }
});
