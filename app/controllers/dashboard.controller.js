// app/controllers/dashboard.controller.js
import pool from '../config/database.js';

/**
 * Normaliza los datos de un proyecto para el frontend.
 * @param {Object} project - Proyecto desde la base de datos.
 */
function normalizeProject(project) {
    return {
        id: project.id_proyecto,
        name: project.nombre,
        description: project.descripcion || '',
        startDate: project.fecha_inicio,
        dueDate: project.fecha_vencimiento,
        ownerId: project.creado_por,
        taskCount: project.task_count || 0,
        memberCount: project.member_count || 1, // Incluye al creador
        progress: calculateProgress(project) // Función auxiliar (opcional)
    };
}

/**
 * Calcula el progreso de un proyecto basado en tareas completadas (opcional).
 * @param {Object} project - Proyecto desde la base de datos.
 */
function calculateProgress(project) {
    if (!project.total_tasks) return 0;
    return Math.round((project.completed_tasks / project.total_tasks) * 100);
}

/**
 * Obtiene todos los datos necesarios para el dashboard principal.
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 */
async function getDashboardData(req, res) {
    const userId = req.usuario.id; // ID del usuario autenticado

    try {
        // 1. Proyectos del usuario (como creador o miembro) con métricas
        const [projects] = await pool.execute(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto) AS task_count,
                (SELECT COUNT(*) FROM miembros_de_equipo me WHERE me.id_proyecto = p.id_proyecto) + 1 AS member_count,
                (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto AND t.estado = 'completada') AS completed_tasks,
                (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto) AS total_tasks
            FROM proyectos p
            WHERE p.creado_por = ? OR EXISTS (
                SELECT 1 FROM miembros_de_equipo me 
                WHERE me.id_proyecto = p.id_proyecto AND me.id_usuario = ?
            )
            ORDER BY p.fecha_creacion DESC
        `, [userId, userId]);

        // 2. Tareas recientes (últimas 5)
        const [recentTasks] = await pool.execute(`
            SELECT 
                t.id_tarea, 
                t.nombre_tarea AS title, 
                t.estado AS status,
                t.fecha_vencimiento AS dueDate,
                p.nombre AS projectName,
                u.nombre AS assignedToName
            FROM tareas t
            JOIN proyectos p ON t.id_proyecto = p.id_proyecto
            LEFT JOIN usuarios u ON t.asignado_a = u.id_usuario
            WHERE t.id_proyecto IN (
                SELECT id_proyecto FROM proyectos 
                WHERE creado_por = ? OR EXISTS (
                    SELECT 1 FROM miembros_de_equipo me 
                    WHERE me.id_proyecto = p.id_proyecto AND me.id_usuario = ?
                )
            )
            ORDER BY t.fecha_creacion DESC
            LIMIT 5
        `, [userId, userId]);

        // 3. Estadísticas globales (opcional)
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT p.id_proyecto) AS total_projects,
                COUNT(DISTINCT t.id_tarea) AS total_tasks,
                COUNT(DISTINCT CASE WHEN t.estado = 'completada' THEN t.id_tarea END) AS completed_tasks
            FROM proyectos p
            LEFT JOIN tareas t ON p.id_proyecto = t.id_proyecto
            WHERE p.creado_por = ? OR EXISTS (
                SELECT 1 FROM miembros_de_equipo me 
                WHERE me.id_proyecto = p.id_proyecto AND me.id_usuario = ?
            )
        `, [userId, userId]);

        // Respuesta consolidada
        res.json({
            success: true,
            data: {
                projects: projects.map(normalizeProject),
                recentTasks: recentTasks.map(task => ({
                    id: task.id_tarea,
                    title: task.title,
                    status: task.status,
                    dueDate: task.dueDate,
                    projectName: task.projectName,
                    assignedTo: task.assignedToName || 'Sin asignar'
                })),
                stats: {
                    totalProjects: stats[0].total_projects,
                    totalTasks: stats[0].total_tasks,
                    completionRate: stats[0].total_tasks > 0 
                        ? Math.round((stats[0].completed_tasks / stats[0].total_tasks) * 100)
                        : 0
                }
            }
        });

    } catch (error) {
        console.error('Error en getDashboardData:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar los datos del dashboard',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
}

export const methods = {
    getDashboardData
};