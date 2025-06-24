// app/controllers/project.controller.js
import pool from '../config/database.js';
import crypto from 'crypto'; // Para generar IDs únicos (UUIDs)

// --- Funciones Auxiliares (Normalización de datos de DB a JS) ---

/**
 * Normaliza un resultado de fila de la base de datos de 'proyectos'
 * a un formato camelCase o adecuado para el frontend.
 * @param {Object} row - Objeto de una fila de la base de datos.
 * @returns {Object} Objeto con propiedades normalizadas.
 */
function normalizeProjectRow(row) {
    if (!row) return null;
    return {
        _id: row.id_proyecto,
        name: row.nombre,
        description: row.descripcion,
        startDate: row.fecha_inicio,
        dueDate: row.fecha_vencimiento,
        owner: row.creado_por, // <-- CORREGIDO: Usar 'creado_por'
        members: JSON.parse(row.miembros_json || '[]'), // Asume que los miembros se guardan como JSON string
        createdAt: row.fecha_creacion
    };
}

/**
 * Normaliza un resultado de fila de la base de datos de 'tareas'.
 * @param {Object} row - Objeto de una fila de la base de datos.
 * @returns {Object} Objeto con propiedades normalizadas.
 */
function normalizeTaskRow(row) {
    if (!row) return null;
    return {
        _id: row.id_tarea,
        projectId: row.id_proyecto,
        title: row.nombre_tarea, // <-- CORREGIDO: Usar 'nombre_tarea'
        description: row.descripcion,
        status: row.estado,
        priority: row.prioridad,
        startDate: row.fecha_inicio,
        dueDate: row.fecha_vencimiento,
        assignedTo: row.asignado_a, // <-- CORREGIDO: Usar 'asignado_a'
        progressPercentage: row.porcentaje_avance,
        createdAt: row.fecha_creacion,
        lastUpdated: row.ultima_actualizacion,
        parentTask: row.tarea_padre, // <-- CORREGIDO: Usar 'tarea_padre'
        dependencies: JSON.parse(row.dependencias_json || '[]') // Asume que dependencias se guarda como JSON string
    };
}

/**
 * Normaliza un resultado de fila de la base de datos de 'comentarios'.
 * @param {Object} row - Objeto de una fila de la base de datos.
 * @returns {Object} Objeto con propiedades normalizadas.
 */
function normalizeCommentRow(row) {
    if (!row) return null;
    return {
        _id: row.id_comentario,
        taskId: row.id_tarea,
        projectId: row.id_proyecto, // <-- Añadido según tu esquema de comentarios
        authorId: row.id_usuario, // <-- CORREGIDO: Usar 'id_usuario'
        text: row.contenido, // <-- CORREGIDO: Usar 'contenido'
        date: row.fecha_creacion // Asume que la fecha es un tipo de fecha válido de SQL
    };
}

/**
 * Normaliza un resultado de fila de la base de datos de 'subtareas'.
 * @param {Object} row - Objeto de una fila de la base de datos.
 * @returns {Object} Objeto con propiedades normalizadas.
 */
function normalizeSubtaskRow(row) {
    if (!row) return null;
    return {
        _id: row.id_subtarea, // Asumiendo que existe una tabla 'subtareas'
        taskId: row.tarea_padre, // <-- CORREGIDO: Usar 'tarea_padre' para relacionar
        title: row.titulo, // Asumiendo que es 'titulo' para subtareas
        description: row.descripcion,
        startDate: row.fecha_inicio,
        dueDate: row.fecha_vencimiento,
        priority: row.prioridad,
        status: row.estado,
        assignedTo: row.asignado_a
    };
}


// --- Métodos del Controlador de Proyectos ---

/**
 * Crea un nuevo proyecto en la base de datos.
 * Ruta: POST /api/projects
 * Protegida por authorization.soloAdmin
 */
async function createProject(req, res) {
    const { name, startDate, dueDate } = req.body;
    // Asegurarse de que la descripción sea null si está vacía o indefinida
    const description = req.body.description === undefined || req.body.description.trim() === '' ? null : req.body.description.trim();
    const ownerId = req.usuario.id; // Obtenido del token JWT a través del middleware

    // --- CORRECCIÓN CLAVE AQUÍ: !dueDate en lugar de !!dueDate ---
    if (!name || !startDate || !dueDate) {
        return res.status(400).json({ message: 'Nombre, fecha de inicio y fecha de vencimiento son obligatorios.' });
    }

    try {
        const projectId = crypto.randomUUID(); // Genera un UUID para el proyecto (VARCHAR)

        // Insertar el proyecto
        const [result] = await pool.execute(
            'INSERT INTO proyectos (id_proyecto, nombre, descripcion, fecha_inicio, fecha_vencimiento, creado_por, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [projectId, name, description, startDate, dueDate, ownerId]
        );

        // Opcional: añadir al propietario como miembro del proyecto automáticamente (si tienes tabla de miembros_proyecto)
        // Asumiendo tabla 'miembros_de_equipo'
        const miembroId = crypto.randomUUID(); // <--- Generar UUID para id_miembro
        await pool.execute(
            'INSERT INTO miembros_de_equipo (id_miembro, id_proyecto, id_usuario, rol, fecha_union) VALUES (?, ?, ?, ?, NOW())',
            [miembroId, projectId, ownerId, 'administrador'] // El propietario es administrador
        );

        res.status(201).json({
            message: 'Proyecto creado exitosamente.',
            project: { _id: projectId, name, owner: ownerId }
        });
    } catch (error) {
        console.error('Error al crear proyecto:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear el proyecto.' });
    }
}

/**
 * Obtiene todos los proyectos en los que el usuario autenticado participa.
 * Se espera que el frontend filtre entre "mis proyectos" (owner) y "proyectos en los que participo" (member).
 * Ruta: GET /api/projects
 * Protegida por authorization.soloAdmin
 */
async function getAllProjects(req, res) {
    const userId = req.usuario.id;

    try {
        // Consulta para obtener proyectos donde el usuario es propietario o miembro.
        // Asegúrate de que tu tabla `proyectos` tenga una columna `creado_por` y que
        // la tabla `miembros_de_equipo` relacione `id_proyecto` con `id_usuario`.
        const [rows] = await pool.execute(
            `SELECT p.id_proyecto, p.nombre, p.descripcion, p.fecha_inicio, p.fecha_vencimiento, p.creado_por, p.fecha_creacion,
                    (SELECT JSON_ARRAYAGG(me.id_usuario) 
                     FROM miembros_de_equipo me 
                     WHERE me.id_proyecto = p.id_proyecto) AS miembros_json
             FROM proyectos p
             LEFT JOIN miembros_de_equipo me ON p.id_proyecto = me.id_proyecto
             WHERE p.creado_por = ? OR me.id_usuario = ?
             GROUP BY p.id_proyecto`, // Agrupar para evitar duplicados si un usuario es miembro múltiple
            [userId, userId]
        );

        const projects = rows.map(normalizeProjectRow);
        res.json(projects);

    } catch (error) {
        console.error('Error al obtener proyectos del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener proyectos.' });
    }
}

/**
 * Obtiene todas las tareas para un proyecto específico.
 * Ruta: GET /api/projects/:projectId/tasks
 * Protegida por authorization.soloAdmin (debería verificar que el usuario sea miembro del proyecto)
 */
async function getProjectTasks(req, res) {
    const { projectId } = req.params;
    const userId = req.usuario.id;

    try {
        // Primero, verifica que el usuario es miembro o propietario del proyecto.
        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, userId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, userId]
        );

        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro de este proyecto.' });
        }

        // --- CORREGIDO: Nombres de columna en SELECT para 'tareas' ---
        const [rows] = await pool.execute(
            `SELECT
    id_tarea, id_proyecto, nombre_tarea, descripcion, estado, prioridad,
    fecha_inicio, fecha_vencimiento, asignado_a, porcentaje_avance,
    fecha_creacion, ultima_actualizacion, tarea_padre,
    COALESCE(
        (SELECT JSON_ARRAYAGG(td.id_dependencia)
         FROM tarea_dependencias td
         WHERE td.id_tarea_principal = t.id_tarea),
        '[]'
    ) AS dependencias_json
FROM tareas t
WHERE id_proyecto = ?;`,
            [projectId]
        );

        const tasks = rows.map(normalizeTaskRow);
        res.json(tasks);

    } catch (error) {
        console.error('Error al obtener tareas del proyecto:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener tareas.' });
    }
}
async function createTask(req, res) {
    const { projectId } = req.params;
    const userId = req.usuario.id; // Quien crea la tarea
    const { title, description, startDate, dueDate, priority, assignedTo, dependencies } = req.body;
    const nombreTarea = title; // Mapear 'title' del frontend a 'nombre_tarea' de la DB
    const asignadoA = assignedTo === '' ? null : assignedTo; // Convertir '' a null para DB

    if (!nombreTarea || !startDate || !dueDate) {
        return res.status(400).json({ message: 'Título, fecha de inicio y fecha límite de la tarea son obligatorios.' });
    }

    try {
        // Verificar membresía del proyecto
        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, userId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, userId]
        );
        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro de este proyecto.' });
        }

        // --- Validar fechas de la tarea principal respecto al proyecto ---
        const [projectInfo] = await pool.execute(
            'SELECT fecha_inicio, fecha_vencimiento FROM proyectos WHERE id_proyecto = ?',
            [projectId]
        );
        if (projectInfo.length === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado.' });
        }
        const projectStart = projectInfo[0].fecha_inicio;
        const projectDue = projectInfo[0].fecha_vencimiento;

        if (startDate < projectStart || dueDate > projectDue) {
            return res.status(400).json({
                message: `Las fechas de la tarea (${startDate} a ${dueDate}) deben estar dentro del rango del proyecto (${projectStart} a ${projectDue}).`
            });
        }
        // --- Fin validación fechas ---

        const taskId = crypto.randomUUID(); // Genera un UUID
        const defaultStatus = 'pendiente'; // Estado inicial de la tarea
        const defaultProgress = 0; // Porcentaje de avance inicial

        // --- CORREGIDO: Nombres de columna en INSERT para 'tareas' ---
        const [result] = await pool.execute(
            `INSERT INTO tareas (id_tarea, id_proyecto, nombre_tarea, descripcion, estado, prioridad, fecha_inicio, fecha_vencimiento, asignado_a, porcentaje_avance, fecha_creacion, ultima_actualizacion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [taskId, projectId, nombreTarea, description, defaultStatus, priority, startDate, dueDate, asignadoA, defaultProgress]
        );

        // Si hay dependencias, insertarlas en una tabla de relación (ej. tarea_dependencias)
        if (dependencies && dependencies.length > 0) {
            const dependencyInserts = dependencies.map(depId => [taskId, depId]);
            // Asumiendo que tarea_dependencias tiene id_tarea_principal y id_dependencia
            await pool.query('INSERT INTO tarea_dependencias (id_tarea_principal, id_dependencia) VALUES ?', [dependencyInserts]);
        }

        res.status(201).json({
            message: 'Tarea creada exitosamente.',
            task: { _id: taskId, projectId, title: nombreTarea, status: defaultStatus }
        });
    } catch (error) {
        console.error('Error al crear tarea:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear la tarea.' });
    }
}
async function updateTask(req, res) {
    const { projectId, taskId } = req.params;
    const userId = req.usuario.id;
    const { title, description, startDate, dueDate, priority, status, assignedTo, dependencies, progressPercentage } = req.body;
    const nombreTarea = title;
    const asignadoA = assignedTo === '' ? null : assignedTo;

    try {
        // Verificar membresía del proyecto
        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, userId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, userId]
        );
        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro de este proyecto.' });
        }

        // Validar fechas si se van a actualizar
        if (startDate !== undefined || dueDate !== undefined) {
            const [projectInfo] = await pool.execute(
                'SELECT fecha_inicio, fecha_vencimiento FROM proyectos WHERE id_proyecto = ?',
                [projectId]
            );
            if (projectInfo.length === 0) {
                return res.status(404).json({ message: 'Proyecto no encontrado.' });
            }
            const projectStart = projectInfo[0].fecha_inicio;
            const projectDue = projectInfo[0].fecha_vencimiento;

            // Si no se envía alguno de los dos, obtener el valor actual de la tarea
            let newStart = startDate, newDue = dueDate;
            if (startDate === undefined || dueDate === undefined) {
                const [taskInfo] = await pool.execute(
                    'SELECT fecha_inicio, fecha_vencimiento FROM tareas WHERE id_tarea = ? AND id_proyecto = ?',
                    [taskId, projectId]
                );
                if (taskInfo.length === 0) {
                    return res.status(404).json({ message: 'Tarea no encontrada.' });
                }
                if (startDate === undefined) newStart = taskInfo[0].fecha_inicio;
                if (dueDate === undefined) newDue = taskInfo[0].fecha_vencimiento;
            }

            if (newStart < projectStart || newDue > projectDue) {
                return res.status(400).json({
                    message: `Las fechas de la tarea (${newStart} a ${newDue}) deben estar dentro del rango del proyecto (${projectStart} a ${projectDue}).`
                });
            }
        }

        let updateFields = [];
        let queryParams = [];

        if (nombreTarea !== undefined) { updateFields.push('nombre_tarea = ?'); queryParams.push(nombreTarea); }
        if (description !== undefined) { updateFields.push('descripcion = ?'); queryParams.push(description); }
        if (startDate !== undefined) { updateFields.push('fecha_inicio = ?'); queryParams.push(startDate); }
        if (dueDate !== undefined) { updateFields.push('fecha_vencimiento = ?'); queryParams.push(dueDate); }
        if (priority !== undefined) { updateFields.push('prioridad = ?'); queryParams.push(priority); }
        if (status !== undefined) { updateFields.push('estado = ?'); queryParams.push(status); }
        if (asignadoA !== undefined) { updateFields.push('asignado_a = ?'); queryParams.push(asignadoA); }
        if (progressPercentage !== undefined) { updateFields.push('porcentaje_avance = ?'); queryParams.push(progressPercentage); }

        if (updateFields.length === 0 && dependencies === undefined) {
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        // Añadir actualización de ultima_actualizacion
        updateFields.push('ultima_actualizacion = NOW()');

        let updateQuery = 'UPDATE tareas SET ' + updateFields.join(', ') + ' WHERE id_tarea = ? AND id_proyecto = ?';
        queryParams.push(taskId, projectId);

        const [result] = await pool.execute(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tarea no encontrada o no se pudo actualizar.' });
        }

        // Si se proporcionan dependencias, actualiza la tabla de relaciones
        if (dependencies !== undefined) {
            // Eliminar dependencias existentes y luego insertar las nuevas
            await pool.execute('DELETE FROM tarea_dependencias WHERE id_tarea_principal = ?', [taskId]);
            if (dependencies.length > 0) {
                const dependencyInserts = dependencies.map(depId => [taskId, depId]);
                await pool.query('INSERT INTO tarea_dependencias (id_tarea_principal, id_dependencia) VALUES ?', [dependencyInserts]);
            }
        }

        res.json({ message: 'Tarea actualizada exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar la tarea.' });
    }
}

async function deleteTask(req, res) {
    const { projectId, taskId } = req.params;
    const userId = req.usuario.id;

    try {
        // Verificar que el usuario tiene permisos para eliminar (ej. es propietario o administrador del proyecto)
        const [projectOwnerOrAdmin] = await pool.execute(
            `SELECT p.creado_por, me.rol FROM proyectos p
             LEFT JOIN miembros_de_equipo me ON p.id_proyecto = me.id_proyecto AND me.id_usuario = ?
             WHERE p.id_proyecto = ?`,
            [userId, projectId]
        );

        if (projectOwnerOrAdmin.length === 0 ||
            (projectOwnerOrAdmin[0].creado_por !== userId && projectOwnerOrAdmin[0].rol !== 'administrador')) {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para eliminar tareas en este proyecto.' });
        }

        // Primero, eliminar cualquier dependencia donde esta tarea es la tarea principal
        await pool.execute('DELETE FROM tarea_dependencias WHERE id_tarea_principal = ?', [taskId]);
        // Luego, eliminar cualquier dependencia donde esta tarea es la dependencia
        await pool.execute('DELETE FROM tarea_dependencias WHERE id_dependencia = ?', [taskId]);
        // Eliminar comentarios asociados a la tarea
        await pool.execute('DELETE FROM comentarios WHERE id_tarea = ?', [taskId]);
        // Eliminar subtareas asociadas a la tarea
        await pool.execute('DELETE FROM subtareas WHERE tarea_padre = ?', [taskId]); // <-- CORREGIDO: 'tarea_padre'
        // Finalmente, eliminar la tarea
        const [result] = await pool.execute('DELETE FROM tareas WHERE id_tarea = ? AND id_proyecto = ?', [taskId, projectId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tarea no encontrada o no se pudo eliminar.' });
        }

        res.json({ message: 'Tarea eliminada exitosamente.' });

    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la tarea.' });
    }
}

async function getProjectMembers(req, res) {
    const { projectId } = req.params;
    const userId = req.usuario.id;

    try {
        // Verificar membresía del proyecto
        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, userId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, userId]
        );
        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro de este proyecto.' });
        }

        // --- CORREGIDO: Usar 'miembros_de_equipo' y 'id_usuario' de la tabla 'usuarios' ---
        const [rows] = await pool.execute(
            `SELECT u.id_usuario, u.nombre, u.apellido, u.email
             FROM usuarios u
             JOIN miembros_de_equipo me ON u.id_usuario = me.id_usuario
             WHERE me.id_proyecto = ?`,
            [projectId]
        );

        const members = rows.map(row => ({
            _id: row.id_usuario,
            nombre: row.nombre,
            apellido: row.apellido,
            email: row.email
        }));

        res.json(members);

    } catch (error) {
        console.error('Error al obtener miembros del proyecto:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener miembros.' });
    }
}

async function inviteUserToProject(req, res) {
    const { projectId } = req.params;
    const { email, role } = req.body;
    const inviterId = req.usuario.id;

    if (!email || !role) {
        return res.status(400).json({ message: 'El email y el rol son obligatorios.' });
    }

    try {
        // Verificar si el que invita tiene permisos (propietario o administrador del proyecto)
        const [inviterPermissions] = await pool.execute(
            `SELECT p.creado_por, me.rol FROM proyectos p
             LEFT JOIN miembros_de_equipo me ON p.id_proyecto = me.id_proyecto AND me.id_usuario = ?
             WHERE p.id_proyecto = ?`,
            [inviterId, projectId]
        );

        if (inviterPermissions.length === 0 ||
            (inviterPermissions[0].creado_por !== inviterId && inviterPermissions[0].rol !== 'administrador')) {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para invitar usuarios a este proyecto.' });
        }

        // Buscar el ID del usuario a invitar por su email
        const [userToInvite] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
        if (userToInvite.length === 0) {
            return res.status(404).json({ message: 'El usuario con ese correo electrónico no existe.' });
        }
        const invitedUserId = userToInvite[0].id_usuario;

        // Verificar si el usuario ya es miembro del proyecto
        const [existingMembership] = await pool.execute(
            'SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?',
            [projectId, invitedUserId]
        );
        if (existingMembership[0].count > 0) {
            return res.status(409).json({ message: 'El usuario ya es miembro de este proyecto.' });
        }

        // Añadir al usuario como miembro del proyecto
        const miembroId = crypto.randomUUID(); // <--- Generar UUID para id_miembro
        await pool.execute(
            'INSERT INTO miembros_de_equipo (id_miembro, id_proyecto, id_usuario, rol, fecha_union) VALUES (?, ?, ?, ?, NOW())',
            [miembroId, projectId, invitedUserId, role]
        );

        // Opcional: Enviar un email de notificación al usuario invitado.
        // Aquí llamarías a tu mail.service.js si tuvieras la lógica para enviar correos.
        // mailService.sendInvitationEmail(email, projectName, inviterName);

        res.status(200).json({ message: `Usuario ${email} invitado exitosamente al proyecto.` });

    } catch (error) {
        console.error('Error al invitar usuario al proyecto:', error);
        res.status(500).json({ message: 'Error interno del servidor al invitar usuario.' });
    }
}

async function addCommentToTask(req, res) {
    const { taskId } = req.params;
    const { text } = req.body;
    const authorId = req.usuario.id;

    if (!text) {
        return res.status(400).json({ message: 'El texto del comentario no puede estar vacío.' });
    }

    try {
        // Verificar que la tarea existe y que el usuario es miembro de su proyecto
        const [taskInfo] = await pool.execute('SELECT id_proyecto FROM tareas WHERE id_tarea = ?', [taskId]);
        if (taskInfo.length === 0) {
            return res.status(404).json({ message: 'Tarea no encontrada.' });
        }
        const projectId = taskInfo[0].id_proyecto;

        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, authorId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, authorId]
        );
        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro del proyecto de esta tarea.' });
        }

        const commentId = crypto.randomUUID();
        // --- CORREGIDO: Nombres de columna en INSERT para 'comentarios' ---
        const [result] = await pool.execute(
            `INSERT INTO comentarios (id_comentario, id_tarea, id_proyecto, id_usuario, contenido, fecha_creacion)
             VALUES (?, ?, ?, ?, ?, NOW())`, // NOW() para la fecha actual de la DB
            [commentId, taskId, projectId, authorId, text]
        );

        res.status(201).json({
            message: 'Comentario añadido exitosamente.',
            comment: { _id: commentId, taskId, projectId, authorId, text, date: new Date().toISOString() } // Devolver la fecha actual para el frontend
        });

    } catch (error) {
        console.error('Error al añadir comentario:', error);
        res.status(500).json({ message: 'Error interno del servidor al añadir comentario.' });
    }
}

async function getTaskComments(req, res) {
    const { taskId } = req.params;
    const userId = req.usuario.id;

    try {
        // Verificar que la tarea existe y que el usuario es miembro de su proyecto
        const [taskInfo] = await pool.execute('SELECT id_proyecto FROM tareas WHERE id_tarea = ?', [taskId]);
        if (taskInfo.length === 0) {
            return res.status(404).json({ message: 'Tarea no encontrada.' });
        }
        const projectId = taskInfo[0].id_proyecto;

        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, userId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, userId]
        );
        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro del proyecto de esta tarea.' });
        }

        // --- CORREGIDO: Nombres de columna en SELECT para 'comentarios' ---
        const [rows] = await pool.execute(
            `SELECT id_comentario, id_tarea, id_proyecto, id_usuario, contenido, fecha_creacion
             FROM comentarios
             WHERE id_tarea = ? ORDER BY fecha_creacion ASC`,
            [taskId]
        );

        const comments = rows.map(normalizeCommentRow);
        res.json(comments);

    } catch (error) {
        console.error('Error al obtener comentarios de tarea:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener comentarios.' });
    }
}

async function addSubtask(req, res) {
    const { taskId } = req.params; // Este es el ID de la tarea padre
    const userId = req.usuario.id;
    const { title, description, startDate, dueDate, priority, assignedTo } = req.body;
    const nombreSubtarea = title;
    const asignadoA = assignedTo === '' ? null : assignedTo;

    if (!nombreSubtarea || !startDate || !dueDate) {
        return res.status(400).json({ message: 'Título, fecha de inicio y fecha límite de la subtarea son obligatorios.' });
    }

    try {
        // Verificar que la tarea padre existe y que el usuario es miembro de su proyecto
        const [parentTaskInfo] = await pool.execute('SELECT id_proyecto, fecha_inicio, fecha_vencimiento FROM tareas WHERE id_tarea = ?', [taskId]);
        if (parentTaskInfo.length === 0) {
            return res.status(404).json({ message: 'Tarea padre no encontrada.' });
        }
        const projectId = parentTaskInfo[0].id_proyecto;
        const parentStart = parentTaskInfo[0].fecha_inicio;
        const parentDue = parentTaskInfo[0].fecha_vencimiento;

        // Validar fechas de la subtarea respecto a la tarea principal
        if (startDate < parentStart || dueDate > parentDue) {
            return res.status(400).json({
                message: `Las fechas de la subtarea (${startDate} a ${dueDate}) deben estar dentro del rango de la tarea principal (${parentStart} a ${parentDue}).`
            });
        }

        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, userId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, userId]
        );
        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro del proyecto de esta tarea.' });
        }

        const subtaskId = crypto.randomUUID();
        const defaultStatus = 'pendiente';

        const [result] = await pool.execute(
            `INSERT INTO subtareas (id_subtarea, tarea_padre, titulo, descripcion, fecha_inicio, fecha_vencimiento, prioridad, estado, asignado_a)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [subtaskId, taskId, nombreSubtarea, description, startDate, dueDate, priority, defaultStatus, asignadoA]
        );

        res.status(201).json({
            message: 'Subtarea creada exitosamente.',
            subtask: { _id: subtaskId, taskId, title: nombreSubtarea, status: defaultStatus }
        });

    } catch (error) {
        console.error('Error al añadir subtarea:', error);
        res.status(500).json({ message: 'Error interno del servidor al añadir subtarea.' });
    }
}

async function getSubtasks(req, res) {
    const { taskId } = req.params;
    const userId = req.usuario.id;

    try {
        // Verificar que la tarea padre existe y que el usuario es miembro de su proyecto
        const [parentTaskInfo] = await pool.execute('SELECT id_proyecto FROM tareas WHERE id_tarea = ?', [taskId]);
        if (parentTaskInfo.length === 0) {
            return res.status(404).json({ message: 'Tarea padre no encontrada.' });
        }
        const projectId = parentTaskInfo[0].id_proyecto;

        const [projectMembership] = await pool.execute(
            `SELECT COUNT(*) AS count FROM miembros_de_equipo WHERE id_proyecto = ? AND id_usuario = ?`,
            [projectId, userId]
        );
        const [projectOwner] = await pool.execute(
            `SELECT COUNT(*) AS count FROM proyectos WHERE id_proyecto = ? AND creado_por = ?`,
            [projectId, userId]
        );
        if (projectMembership[0].count === 0 && projectOwner[0].count === 0) {
            return res.status(403).json({ message: 'Acceso denegado. No eres miembro del proyecto de esta tarea.' });
        }

        // --- CORREGIDO: Nombres de columna en SELECT para 'subtareas' ---
        const [rows] = await pool.execute(
            `SELECT id_subtarea, tarea_padre, titulo, descripcion, fecha_inicio, fecha_vencimiento, prioridad, estado, asignado_a
             FROM subtareas
             WHERE tarea_padre = ? ORDER BY fecha_inicio ASC`,
            [taskId]
        );

        const subtasks = rows.map(normalizeSubtaskRow);
        res.json(subtasks);

    } catch (error) {
        console.error('Error al obtener subtareas:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener subtareas.' });
    }
}


export const methods = {
    createProject,
    getAllProjects,
    getProjectTasks,
    createTask,
    updateTask,
    deleteTask,
    getProjectMembers,
    inviteUserToProject,
    addCommentToTask,
    getTaskComments,
    addSubtask,
    getSubtasks,
    // addAttachmentToTask // Descomentar y definir la función si se implementa Multer para adjuntos
};
