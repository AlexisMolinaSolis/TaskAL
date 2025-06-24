// app/controllers/user.controller.js
import pool from '../config/database.js';
import bcryptjs from 'bcryptjs';

// Obtener la información del usuario autenticado
async function getUserInfo(req, res) {
    // req.usuario es adjuntado por el middleware 'soloAdmin'
    if (!req.usuario) {
        return res.status(401).json({ message: 'Usuario no autenticado o información no disponible.' });
    }
    // Devolvemos la información del usuario que ya está en req.usuario
    // No incluyas la contraseña ni datos sensibles que no sean necesarios.
    const { id, nombre, apellido, email } = req.usuario;
    res.json({ id, nombre, apellido, email });
}

// Actualizar información del usuario (incluyendo contraseña)
async function updateUserInfo(req, res) {
    const userId = req.usuario.id; // ID del usuario autenticado
    const { nombre, apellido, newPassword } = req.body;

    if (!userId) {
        return res.status(401).json({ message: 'Usuario no autenticado.' });
    }

    try {
        let updateQuery = 'UPDATE usuarios SET nombre = ?, apellido = ? WHERE id_usuario = ?';
        let queryParams = [nombre, apellido, userId];

        // Si se proporciona una nueva contraseña, la hasheamos
        if (newPassword) {
            if (newPassword.length < 8) {
                return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
            }
            const salt = await bcryptjs.genSalt(10);
            const hashPassword = await bcryptjs.hash(newPassword, salt);
            updateQuery = 'UPDATE usuarios SET nombre = ?, apellido = ?, password = ? WHERE id_usuario = ?';
            queryParams = [nombre, apellido, hashPassword, userId];
        }

        const [result] = await pool.execute(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o no se pudo actualizar.' });
        }

        res.json({ message: 'Información del perfil actualizada correctamente.' });

    } catch (error) {
        console.error('Error al actualizar perfil del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar perfil.' });
    }
}

export const methods = {
    getUserInfo,
    updateUserInfo
};