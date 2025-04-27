import bcryptjs from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import { enviarMailVerificacion } from "./../services/mail.service.js";

dotenv.config();

// Base de datos de usuarios (ahora con nombre y apellido)
export const usuarios = [{
  nombre: "Admin",
  apellido: "Sistema",
  email: "j70442280@gmail.com",
  password: "$2a$05$nLY2It8riku2vwwDIINdgO/XIyPXRg1Gn9LFgnhwKqC4TwcAwEUL2",
  verificado: true
}];

async function login(req, res) {
  console.log("Datos recibidos:", req.body);

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send({ status: "Error", message: "Email y contraseña son requeridos" });
  }

  const usuario = usuarios.find(u => u.email.toLowerCase() === email);

  if (!usuario) {
    return res.status(400).send({ status: "Error", message: "Credenciales incorrectas" });
  }

  if (!usuario.verificado) {
    return res.status(403).send({ 
      status: "Error", 
      message: "Por favor verifica tu email antes de iniciar sesión" 
    });
  }

  const passwordCorrecto = await bcryptjs.compare(password, usuario.password);

  if (!passwordCorrecto) {
    return res.status(400).send({ status: "Error", message: "Credenciales incorrectas" });
  }

  const token = jsonwebtoken.sign(
    { 
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || "1h" }
  );

  const cookieOption = {
    expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRES || 7) * 24 * 60 * 60 * 1000),
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  };

  res.cookie("jwt", token, cookieOption);
  return res.send({ 
    status: "ok", 
    message: `Bienvenido ${usuario.nombre}`, 
    redirect: "/admin",
    usuario: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email
    }
  });
}

async function register(req, res) {
  const { nombre, apellido, email, password } = req.body;
  const emailNormalizado = email?.trim().toLowerCase();

  if (!nombre || !apellido || !emailNormalizado || !password) {
    return res.status(400).send({ 
      status: "Error", 
      message: "Todos los campos son obligatorios",
      camposFaltantes: {
        nombre: !nombre,
        apellido: !apellido,
        email: !emailNormalizado,
        password: !password
      }
    });
  }

  const usuarioExistente = usuarios.find(u => u.email.toLowerCase() === emailNormalizado);

  if (usuarioExistente) {
    return res.status(400).send({ status: "Error", message: "Este email ya está registrado" });
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    const hashPassword = await bcryptjs.hash(password, salt);

    const tokenVerificacion = jsonwebtoken.sign(
      { email: emailNormalizado, nombre, apellido },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const mail = await enviarMailVerificacion(emailNormalizado, tokenVerificacion, { nombre, apellido });
    
    if (!mail.accepted || mail.accepted.length === 0) {
      return res.status(500).send({ 
        status: "error", 
        message: "Error enviando email de verificación" 
      });
    }

    const nuevoUsuario = {
      nombre,
      apellido,
      email: emailNormalizado,
      password: hashPassword,
      verificado: false
    };

    usuarios.push(nuevoUsuario);
    
    return res.status(201).send({ 
      status: "ok", 
      message: `Usuario ${nombre} registrado. Verifica tu email.`,
      redirect: "/"
    });

  } catch (error) {
    console.error("Error en registro:", error);
    return res.status(500).send({ 
      status: "error", 
      message: "Error en el proceso de registro" 
    });
  }
}

function verificarCuenta(req, res) {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.redirect("/?error=token_requerido");
    }

    const decodificado = jsonwebtoken.verify(token, process.env.JWT_SECRET);
    
    if (!decodificado?.email) {
      return res.redirect("/?error=token_invalido");
    }

    const usuarioIndex = usuarios.findIndex(u => u.email.toLowerCase() === decodificado.email.toLowerCase());

    if (usuarioIndex === -1) {
      return res.redirect("/?error=usuario_no_encontrado");
    }

    // Actualizar usuario
    usuarios[usuarioIndex].verificado = true;
    const usuario = usuarios[usuarioIndex];

    // Crear cookie de sesión
    const tokenSesion = jsonwebtoken.sign(
      { 
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "1h" }
    );

    res.cookie("jwt", tokenSesion, {
      expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRES || 7) * 24 * 60 * 60 * 1000),
      path: "/",
      httpOnly: true
    });

    return res.redirect("/?verificado=exito");

  } catch (error) {
    console.error("Error en verificación:", error);
    return res.redirect("/?error=verificacion_fallida");
  }
}

export const methods = {
  login,
  register,
  verificarCuenta 
};