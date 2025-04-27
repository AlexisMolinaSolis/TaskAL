import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import { usuarios } from "./../controllers/authentication.controller.js";

dotenv.config();

function soloAdmin(req, res, next) {
  const usuario = revisarCookie(req);
  if (usuario) {
    // Opcional: Verificar si es admin (si tienes ese rol)
    return next();
  }
  return res.redirect("/");
}

function soloPublico(req, res, next) {
  const usuario = revisarCookie(req);
  if (!usuario) {
    return next();
  }
  return res.redirect("/admin");
}

function revisarCookie(req) {
  try {
    // 1. Verificar si existe la cookie
    if (!req.headers.cookie) {
      return false;
    }

    // 2. Extraer la cookie JWT
    const cookies = req.headers.cookie.split("; ");
    const jwtCookie = cookies.find(cookie => cookie.startsWith("jwt="));
    
    if (!jwtCookie) {
      return false;
    }

    const cookieJWT = jwtCookie.slice(4);
    
    // 3. Verificar y decodificar el token
    const decodificada = jsonwebtoken.verify(cookieJWT, process.env.JWT_SECRET);
    console.log("Token decodificado:", decodificada);

    // 4. Buscar usuario por email (ahora usamos email en lugar de user)
    const usuario = usuarios.find(u => u.email === decodificada.email);
    console.log("Usuario encontrado:", usuario);

    // 5. Verificar si el usuario existe y está verificado
    if (!usuario || !usuario.verificado) {
      return false;
    }

    // Devolver datos del usuario para usar en los middlewares
    return {
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      // Agregar otros datos necesarios
    };
  } catch (error) {
    console.error("Error al revisar cookie:", error);
    return false;
  }
}

export const methods = {
  soloAdmin,
  soloPublico,
  revisarCookie // Exportamos para poder usarla directamente si es necesario
};