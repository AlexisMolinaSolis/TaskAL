 // Selección de elementos
const mensajeError = document.querySelector('.error-message');
const mensajeExito = document.querySelector('.success-message');
const registerForm = document.getElementById('registerForm');

// Funciones para manejo de mensajes
function mostrarMensaje(elemento, mensaje, esError = true) {
  if (elemento) {
    elemento.textContent = mensaje;
    elemento.style.display = 'block';
    elemento.style.color = esError ? '#dc3545' : '#28a745';
  }
}

function ocultarMensajes() {
  [mensajeError, mensajeExito].forEach(el => {
    if (el) el.style.display = 'none';
  });
}

// Evento de submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarMensajes();

  // Obtener valores del formulario
  const nombre = e.target.elements.name.value.trim();
  const apellido = e.target.elements.apellido.value.trim();
  const email = e.target.elements.email.value.trim().toLowerCase();
  const password = e.target.elements.password.value;
  const confirmPassword = e.target.elements.confirmPassword.value;

  // Validaciones frontend mejoradas
  if (!nombre || !apellido || !email || !password || !confirmPassword) {
    mostrarMensaje(mensajeError, 'Todos los campos son obligatorios');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrarMensaje(mensajeError, 'Por favor ingresa un email válido');
    return;
  }

  if (password.length < 8) {
    mostrarMensaje(mensajeError, 'La contraseña debe tener al menos 8 caracteres');
    return;
  }

  if (password !== confirmPassword) {
    mostrarMensaje(mensajeError, 'Las contraseñas no coinciden');
    return;
  }

  try {
    // Mostrar estado de carga
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando...';

    const response = await fetch('http://localhost:4000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
      throw new Error(data.message || 'Error en el registro');
    }

    // Registro exitoso
    mostrarMensaje(mensajeExito, `¡Registro exitoso! Se ha enviado un email de verificación a ${email}`, false);
    
    // Redirigir después de 5 segundos
    setTimeout(() => {
      window.location.href = data.redirect || '/';
    }, 5000);

  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje(mensajeError, error.message || 'Error de conexión con el servidor');
  } finally {
    // Restaurar botón
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }
});

// Eventos para ocultar mensajes al escribir
['name', 'apellido', 'email', 'password', 'confirmPassword'].forEach(campo => {
  const element = registerForm.elements[campo];
  if (element) {
    element.addEventListener('input', ocultarMensajes);
  }
});