import bcryptjs from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import pool from '../config/database.js'; // Importa la conexión a la base de datos
// import { enviarMailVerificacion } from "./../services/mail.service.js";

import nodemailer from "nodemailer";

dotenv.config();

async function login(req, res) {
  console.log("Datos recibidos:", req.body);

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send({ status: "Error", message: "Email y contraseña son requeridos" });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(400).send({ status: "Error", message: "Credenciales incorrectas" });
    }

    const usuario = rows[0];

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
        apellido: usuario.apellido,
        id: usuario.id // Añade el ID del usuario al token si lo necesitas
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
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).send({ status: "error", message: "Error en el proceso de login" });
  }
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

  try {
    const [existingUser] = await pool.execute('SELECT email FROM usuarios WHERE email = ?', [emailNormalizado]);
    if (existingUser.length > 0) {
      return res.status(400).send({ status: "Error", message: "Este email ya está registrado" });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashPassword = await bcryptjs.hash(password, salt);

    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre, apellido, email, password, verificado) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellido, emailNormalizado, hashPassword, 0]
    );

    // Generar token de verificación
    const verificationToken = jsonwebtoken.sign(
      { email: emailNormalizado },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    const verificationLink = `${process.env.BASE_URL || "http://localhost:4000"}/verificar-cuenta?token=${verificationToken}`;

    const plantillaMail = `
      <p>¡Hola ${nombre}!</p>
      <p>Gracias por registrarte en TaskAL. Estamos emocionados de tenerte con nosotros.</p>
      <p>Para comenzar a usar tu cuenta, por favor verifica tu dirección de email:</p>
      <p>
        <a href="${verificationLink}" style="background:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
          Verificar mi cuenta
        </a>
      </p>
      <p>Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
      <a href="${verificationLink}">${verificationLink}</a></p>
      <p>Si no solicitaste este registro, por favor ignora este mensaje.<br>
      Atentamente, El equipo de TaskAL</p>
    `;

    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'molinasolisalexisjesus@gmail.com',
            pass: 'omyn ukhr gcdk furp'
        }
    });

    let mailOptions = {
        from: 'molinasolisalexisjesus@gmail.com',
        to: emailNormalizado,
        subject: 'Verificación de Cuenta TaskAl',
        html: plantillaMail
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });

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
async function verificarCuenta(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect("/?error=token_requerido");
    }

    const decodificado = jsonwebtoken.verify(token, process.env.JWT_SECRET);

    if (!decodificado?.email) {
      return res.redirect("/?error=token_invalido");
    }

    // Buscar usuario por email
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [decodificado.email]);
    if (rows.length === 0) {
      return res.redirect("/?error=usuario_no_encontrado");
    }

    const usuario = rows[0];

      if (!usuario.verificado) {
      // Cambiar verificado a 1 usando id_usuario
      await pool.execute('UPDATE usuarios SET verificado = 1 WHERE id_usuario = ?', [usuario.id_usuario]);
      usuario.verificado = 1; // Actualiza el objeto para el token
    }

    // Crear cookie de sesión (igual que en login)
    const tokenSesion = jsonwebtoken.sign(
      {
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        id: usuario.id_usuario
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "1h" }
    );

    res.cookie("jwt", tokenSesion, {
      expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRES || 7) * 24 * 60 * 60 * 1000),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    });

    // Redirige a la página principal ya logueado
    return res.redirect("/");

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