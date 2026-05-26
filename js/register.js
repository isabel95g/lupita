const API = "http://localhost:3001";

document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = document.getElementById("user").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!user || !email || !password) {
        alert("Completa todos los campos");
        return;
    }

    try {
        const res = await fetch(`${API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user,
                email,
                password
            })
        });

        const data = await res.json();

        if (data.success) {
            alert("Usuario registrado correctamente");
            window.location.href = "login.html";
        } else {
            alert("Error al registrar");
        }

    } catch (error) {
        console.error(error);
        alert("Error de conexión");
    }
});
