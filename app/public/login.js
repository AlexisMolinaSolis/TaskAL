const mensajeError = document.querySelector(".error-message");
const loginForm = document.getElementById("loginForm");

// Función para mostrar mensajes de error
function mostrarError(mensaje) {
  mensajeError.textContent = mensaje;
  mensajeError.classList.toggle("escondido", false);
}

// Función para ocultar mensajes de error
function ocultarError() {
  mensajeError.classList.toggle("escondido", true);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarError(); // Ocultar errores previos
  
  // Obtener valores del formulario
  const email = e.target.elements.email.value.trim().toLowerCase();
  const password = e.target.elements.password.value;

  // Validación básica del frontend
  if (!email || !password) {
    mostrarError("Por favor ingresa tu email y contraseña");
    return;
  }

  // Validación simple de formato de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrarError("Por favor ingresa un email válido");
    return;
  }

  try {
    const res = await fetch("http://localhost:4000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      }),
      credentials: "include" // Importante para recibir cookies
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      mostrarError(errorData.message || "Credenciales incorrectas");
      return;
    }
    
    const resJson = await res.json();
    
    // Opcional: Mostrar mensaje de bienvenida
    if (resJson.usuario) {
      console.log(`Bienvenido ${resJson.usuario.nombre} ${resJson.usuario.apellido}`);
    }
    
    // Redirección
    if (resJson.redirect) {
      window.location.href = resJson.redirect;
    }
    
  } catch (error) {
    console.error("Error en la solicitud:", error);
    mostrarError("Error de conexión con el servidor");
  }
});

// Opcional: Validación en tiempo real
loginForm.elements.email.addEventListener("input", () => {
  ocultarError();
});

loginForm.elements.password.addEventListener("input", () => {
  ocultarError();
});