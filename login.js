// login.js
const form = document.querySelector("form");
const API_LOGIN = "http://127.0.0.1:8000/auth/login";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Completa todos los campos");
    return;
  }

  try {
    const res = await fetch(API_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      alert(error.detail || "Error en login");
      return;
    }

    const data = await res.json();

    // Guardamos token y rol
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);

    // Chequeamos el rol
    if (data.role === "admin") {
      window.location.href = "/frontend/admin.html";
    } else if (data.role === "user") {
      window.location.href = "/frontend/index.html";
    } else {
      alert("Rol no reconocido");
    }
  } catch (err) {
    console.error("Error en login:", err);
    alert("Error de conexión con el servidor");
  }
});
