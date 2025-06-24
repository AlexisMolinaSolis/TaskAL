import express, { application } from "express";
import cookieParser from 'cookie-parser';
import path from 'path';
import {fileURLToPath} from 'url';
import dotenv from "dotenv"; // Necesario para cargar variables de entorno (como JWT_SECRET)
import jsonwebtoken from "jsonwebtoken"; // Necesario para verificar JWTs

// Importa controladores y middlewares
import {methods as authentication} from "./controllers/authentication.controller.js";
import {methods as authorization} from "./middlewares/authorization.js";

// Importa el controlador de usuario
import {methods as userController} from "./controllers/user.controller.js"; 

//Importa el controlador del proyecto 
import { methods as projectController} from "./controllers/project.controller.js";
import { methods as dashboardController } from "./controllers/dashboard.controller.js";



dotenv.config(); // Carga las variables de entorno desde .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//const nodemailer = require('nodemailer');

const app = express();
app.set("port",4000);

// --- Configuración (Middlewares Globales) ---
app.use(express.static(path.join(__dirname, "public"))); // Sirve archivos estáticos
app.use(express.json()); // Habilita el parseo de bodies JSON
app.use(cookieParser()); // Habilita el parseo de cookies
app.use(express.urlencoded({ extended: true })); // Habilita el parseo de bodies URL-encoded (por si acaso)


// Middleware personalizado para verificar y limpiar cookies JWT inválidas
app.use((req, res, next) => {
    if (req.cookies.jwt) {
      try {
        jsonwebtoken.verify(req.cookies.jwt, process.env.JWT_SECRET);
      } catch (error) {
        res.clearCookie("jwt");
        console.log("Cookie inválida eliminada automáticamente");
      }
    }
    next();
});

// --- Rutas de la Aplicación ---

// Rutas para servir páginas HTML (protegidas por middleware de autorización)
app.get("/",authorization.soloPublico, (req,res)=> res.sendFile(path.join(__dirname, "pages", "login.html")));
app.get("/register",authorization.soloPublico,(req,res)=> res.sendFile(path.join(__dirname, "pages", "register.html")));
app.get("/admin",authorization.soloAdmin,(req,res)=> res.sendFile(path.join(__dirname, "pages", "admin", "admin.html")));
app.get("/verificar/:token", authentication.verificarCuenta); // Ruta de verificación de cuenta por correo

// Rutas de API de autenticación (login y registro)
app.post("/api/login",authentication.login);
app.post("/api/register",authentication.register);

// --- Rutas de API Protegidas para Proyectos ---
app.post("/api/projects", authorization.soloAdmin, projectController.createProject);


app.get("/api/projects", authorization.soloAdmin, projectController.getAllProjects);
app.post("/api/projects", authorization.soloAdmin, projectController.createProject);
// Asegúrate de que esta línea exista y sea correcta:
app.get("/api/projects", authorization.soloAdmin, projectController.getAllProjects);
app.get("/api/projects/:projectId/tasks", authorization.soloAdmin, projectController.getProjectTasks);
app.post("/api/projects/:projectId/tasks", authorization.soloAdmin, projectController.createTask);
app.put("/api/projects/:projectId/tasks/:taskId", authorization.soloAdmin, projectController.updateTask);
app.delete("/api/projects/:projectId/tasks/:taskId", authorization.soloAdmin, projectController.deleteTask);
app.get("/api/projects/:projectId/members", authorization.soloAdmin, projectController.getProjectMembers);
app.post("/api/projects/:projectId/invite", authorization.soloAdmin, projectController.inviteUserToProject);

// --- Nuevo: Rutas de API Protegidas para Información del Usuario ---
app.get("/api/user/info", authorization.soloAdmin, userController.getUserInfo);
app.put("/api/user/profile", authorization.soloAdmin, userController.updateUserInfo);

// Añadir ruta para el dashboard
app.get("/api/dashboard", authorization.soloAdmin, dashboardController.getDashboardData);

app.get("/admin/eventosMail",authorization.soloAdmin);


// --- Nuevo: Manejo de Errores Globales ---

// Middleware para manejar rutas de API no encontradas (404)
// Este middleware se ejecuta si ninguna ruta definida antes ha manejado la solicitud.
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) { // Si la solicitud es a una API
        return res.status(404).json({ message: 'Ruta de API no encontrada.' });
    }
    // Para rutas que no son de API, se sirve tu página 404 HTML
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); // Asegúrate de tener public/404.html
});

// Middleware de manejo de errores global (para errores internos del servidor 500)
// Este middleware se activa si algún error es lanzado (`throw new Error()`)
// o si `next(err)` es llamado en una ruta o middleware anterior.
app.use((err, req, res, next) => {
    console.error('Error global del servidor:', err); // Loggea el error completo para depuración
    if (req.originalUrl.startsWith('/api')) { // Si el error ocurrió en una ruta de la API
        return res.status(err.status || 500).json({
            message: err.message || 'Error interno del servidor.',
            // Muestra el stack trace solo en entorno de desarrollo por seguridad
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
    res.status(err.status || 500).send('<h1>Error 500: Algo salió muy mal en el servidor</h1>');
});



// Inicio del servidor
app.listen(app.get("port"), () => {
    console.log("Servidor Express escuchando en puerto", app.get("port"));
    console.log(`Accede a la aplicación en http://localhost:${app.get("port")}`);
});

