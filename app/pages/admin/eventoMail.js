//omyn ukhr gcdk furp
const forma=document.querySelector('#registerForm');
const usuario = document.querySelector('#name');
const correo = document.querySelector('#email')

const plantillaMail = `<div class="container">
      <h1>¡Hola ${usuario}!</h1>
      <p>Gracias por registrarte en PuntoJson. Estamos emocionados de tenerte con nosotros.</p>
      <p>Para comenzar a usar tu cuenta, por favor verifica tu dirección de email:</p>
      
      <a href="${verificationLink}" class="button">
        Verificar mi cuenta
      </a>
      
      <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">
        ${verificationLink}
      </p>

      <div class="footer">
        <p>Si no solicitaste este registro, por favor ignora este mensaje.</p>
        <p>Atentamente,<br><strong>El equipo de PuntoJson</strong></p>
      </div>

    </div>`;
function sendMsg(e){
	e.preventDefault();
	/*const nombre=document.querySelector('.lname'),
		correo=document.querySelector('.mail'),
		telefono=document.querySelector('.tel'),
		msj=document.querySelector('.msg');*/
		Email.send({
			SecureToken:"omyn ukhr gcdk furp",
			To:correo.value,
			From:'molinasolisalexisjesus@gmail.com',
			Subject:"Verificación de Cuenta TaskAl",
			Body:plantillaMail
		}).then(
		  message=>alert(message)
		);
	}
forma.addEventListener('submit',sendMsg);