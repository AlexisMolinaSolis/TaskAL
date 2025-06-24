const forma=document.querySelector('.contactoGMAIL');
function sendMsg(e){
	e.preventDefault();
	const nombre=document.querySelector('.lname'),
		correo=document.querySelector('.mail'),
		telefono=document.querySelector('.tel'),
		msj=document.querySelector('.msg');		
		Email.send({
			SecureToken:"c40454ce-123a-49b8-93e9-ed83ec251b1f",
			To:'matprimas.tocha.loc33@gmail.com',
			From:correo.value,
			Subject:"Contacto G-Tocha Tocha",
			Body:msj.value
		}).then(
		  message=>alert(message)
		);
	}
forma.addEventListener('submit',sendMsg);