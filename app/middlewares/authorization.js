// app/middlewares/authorization.js
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import pool from '../config/database.js'; // Importa la conexión a la base de datos

dotenv.config();

async function soloAdmin(req, res, next) {
    const usuario = await revisarCookie(req);
    if (usuario) {
        req.usuario = usuario; 
        return next();
    }
    if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ message: 'Acceso no autorizado a la API.' });
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
        // Asegúrate de que tu columna de ID se llama 'id_usuario'
        const [rows] = await pool.execute('SELECT id_usuario, nombre, apellido, email, verificado FROM usuarios WHERE email = ?', [decodificada.email]);

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

        // --- CAMBIO CLAVE AQUÍ: Usar usuario.id_usuario al devolver los datos ---
        return {
            id: usuario.id_usuario, // <--- ¡CORREGIDO! Asigna id_usuario a la propiedad 'id'
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            // Agregar otros datos necesarios
        };
    } catch (error) {
        console.error("Error al revisar cookie:", error);
        // Opcional: limpiar la cookie si es inválida/expirada aquí también,
        // aunque tu `index.js` ya tiene un middleware global para eso.
        return false;
    }
}

// En tu middleware de autorización
async function checkProjectAccess(req, res, next) {
    const projectId = req.params.projectId;
    const userId = req.usuario.id;
    
    const [project] = await pool.execute(
        'SELECT * FROM proyectos WHERE id_proyecto = ? AND (creado_por = ? OR EXISTS (SELECT 1 FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?))',
        [projectId, userId, projectId, userId]
    );
    
    if (!project.length) {
        return res.status(403).json({ message: 'Acceso denegado al proyecto' });
    }
    
    next();
}

export const methods = {
    soloAdmin,
    soloPublico,
    revisarCookie, // Exportamos para poder usarla directamente si es necesario
    checkProjectAccess
};
