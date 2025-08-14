document.getElementById("reclamoForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    // Enviar enabled como string "1" o "0"
    formData.set("enabled", form.elements["enabled"].checked ? "1" : "0");

    try {
        const response = await fetch("http://127.0.0.1:8000/api/reclamos/", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error("Error en la API");

        const data = await response.json();

        document.getElementById("resultado").innerHTML = `
            <div class="alert alert-success" role="alert">
                <h5>ID Reclamo: ${data.id}</h5>
                <p><strong>Respuesta IA:</strong> ${data.message}</p>
            </div>
        `;
    } catch (error) {
        console.error("Error al enviar reclamo:", error);
        document.getElementById("resultado").innerHTML = `
            <div class="alert alert-danger" role="alert">
                Error al enviar el reclamo.
            </div>
        `;
    }
});
