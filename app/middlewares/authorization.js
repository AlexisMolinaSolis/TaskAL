import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import pool from '../config/database.js'; // Importa la conexión a la base de datos

dotenv.config();

async function soloAdmin(req, res, next) {
  const usuario = await revisarCookie(req);
  if (usuario) {
    // Opcional: Aquí podrías verificar si el usuario tiene un rol de administrador
    // Consultando la base de datos si es necesario.
    return next();
  }
  return res.redirect("/");
}

async function soloPublico(req, res, next) {
  const usuario = await revisarCookie(req);
  if (!usuario) {
    return next();
  }
  return res.redirect("/admin");
}

async function revisarCookie(req) {
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

    // 4. Buscar usuario por email en la base de datos
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [decodificada.email]);

    if (rows.length === 0) {
      console.log("Usuario no encontrado en la base de datos");
      return false;
    }

    const usuario = rows[0];
    console.log("Usuario encontrado en la base de datos:", usuario);

    // 5. Verificar si el usuario existe y está verificado
    if (!usuario || !usuario.verificado) {
      console.log("Usuario no verificado o no existe");
      return false;
    }

    // Devolver datos del usuario para usar en los middlewares
    return {
      id: usuario.id,
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