import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Configuración optimizada para Mailtrap
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verificación mejorada con logging detallado
transporter.verify(function(error, success) {
  if (error) {
    console.error("❌ Error al conectar con Mailtrap:", {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
  } else {
    console.log("✔ SMTP configurado correctamente. Listo para enviar emails.");
    console.log("📧 Credenciales usadas:", {
      user: process.env.EMAIL_USER?.substring(0, 3) + '...',
      host: "sandbox.smtp.mailtrap.io"
    });
  }
});

export async function enviarMailVerificacion(email, token, userData = {}) {
  const verificationLink = `${process.env.BASE_URL || 'http://localhost:4000'}/verify?token=${token}`;
  
  const mailOptions = {
    from: `"PuntoJson" <no-reply@puntojson.com>`,
    to: email,
    subject: `¡Bienvenido ${userData.nombre || 'Usuario'}! Verifica tu cuenta`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">¡Hola ${userData.nombre || 'Usuario'}!</h2>
        <p>Por favor verifica tu cuenta haciendo clic en este enlace:</p>
        <a href="${verificationLink}" 
           style="display: inline-block; padding: 12px 24px; 
                  background-color: #2563eb; color: white; 
                  text-decoration: none; border-radius: 4px; margin: 20px 0;">
           Verificar ahora
        </a>
        <p>Si no puedes hacer clic, copia esta URL en tu navegador:</p>
        <code style="word-break: break-all; background: #f0f0f0; 
                    padding: 8px; border-radius: 4px; display: inline-block;">
          ${verificationLink}
        </code>
      </div>
    `,
    text: `Verifica tu cuenta: ${verificationLink}`
  };

  try {
    console.log(`📤 Intentando enviar email de verificación a: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ Email enviado correctamente. ID:", info.messageId);
    console.log("🔗 Enlace de verificación generado:", verificationLink);
    
    return {
      accepted: [email],
      messageId: info.messageId
    };
  } catch (error) {
    console.error("❌ Error crítico al enviar email:", {
      email,
      error: error.message,
      stack: error.stack
    });
    throw new Error("No se pudo enviar el email de verificación");
  }
}