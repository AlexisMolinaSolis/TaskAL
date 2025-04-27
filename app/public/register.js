const mensajeError = document.querySelector(".error-message"); // Mejor usar querySelector
const registerForm = document.getElementById("registerForm");

// Función para mostrar/ocultar errores
function mostrarError(mensaje) {
  mensajeError.textContent = mensaje;
  mensajeError.classList.remove("escondido");
}

function ocultarError() {
  mensajeError.classList.add("escondido");
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarError(); // Resetear errores previos

  // Obtener valores del formulario
  const nombre = e.target.elements.nombre.value.trim();
  const apellido = e.target.elements.apellido.value.trim();
  const email = e.target.elements.email.value.trim().toLowerCase();
  const password = e.target.elements.password.value;
  const confirmPassword = e.target.elements.confirmPassword?.value; // Campo opcional

  // Validación frontend básica
  if (!nombre || !apellido || !email || !password) {
    mostrarError("Todos los campos son obligatorios");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrarError("Por favor ingresa un email válido");
    return;
  }

  if (confirmPassword && password !== confirmPassword) {
    mostrarError("Las contraseñas no coinciden");
    return;
  }

  if (password.length < 8) {
    mostrarError("La contraseña debe tener al menos 8 caracteres");
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        apellido,
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarError(data.message || "Error en el registro");
      return;
    }

    // Registro exitoso
    if (data.redirect) {
      // Opcional: Mostrar mensaje de éxito antes de redirigir
      alert(`¡Registro exitoso! Se ha enviado un email de verificación a ${email}`);
      window.location.href = data.redirect;
    }

  } catch (error) {
    console.error("Error:", error);
    mostrarError("Error de conexión con el servidor");
  }
});

// Validación en tiempo real
registerForm.elements.nombre.addEventListener("input", ocultarError);
registerForm.elements.apellido.addEventListener("input", ocultarError);
registerForm.elements.email.addEventListener("input", ocultarError);
registerForm.elements.password.addEventListener("input", ocultarError);
if (registerForm.elements.confirmPassword) {
  registerForm.elements.confirmPassword.addEventListener("input", ocultarError);
}