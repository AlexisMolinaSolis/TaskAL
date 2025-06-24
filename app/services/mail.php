<?php
use PHPMailer\PHPMailer\{PHPMailer,SMTP,Exception};

require 'negocio/clases/phpmailer/src/PHPMailer.php';//../negocio bla bla
require 'negocio/clases/phpmailer/src/SMTP.php';
require 'negocio/clases/phpmailer/src/Exception.php';

//Load Composer's autoloader
//require 'vendor/autoload.php';

//Create an instance; passing `true` enables exceptions
$mail = new PHPMailer(true);

try {
    //Server settings
    $mail->SMTPDebug = SMTP::DEBUG_SERVER; //SMTP::DEBUG_OFF    //Enable verbose debug output
    $mail->isSMTP();                                            //Send using SMTP
    $mail->Host       = 'mail.jjorgess081.com';                     //Set the SMTP server to send through
    $mail->SMTPAuth   = true;                                   //Enable SMTP authentication
    $mail->Username   = 'no-reply@gmail.com';                     //SMTP username
    $mail->Password   = '';                               //SMTP password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;            //Enable implicit TLS encryption
    $mail->Port       = 465;                                    //TCP port to connect to; use 587 if you have set `SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS`

    //Recipients
    $mail->setFrom('no-reply081@gmail.com', 'Materias Primas Tocha');
    $mail->addAddress('jjorgess081@gmail.com', 'Joe User');     //Add a recipient

    //Attachments
    //$mail->addAttachment('/var/tmp/file.tar.gz');         //Add attachments
    //$mail->addAttachment('/tmp/image.jpg', 'new.jpg');    //Optional name

    //Content
    $mail->isHTML(true);                                  //Set email format to HTML
    $mail->Subject = 'Detalle de su Compra';
    
    $cuerpo ='<h4>Gracias por su Compra</h4>';
    $cuerpo .= '<p>El ID de su compra es <b>'.$id_transaccion.'</b></p>';

    $mail->Body    = utf8_decode($cuerpo);
    $mail->AltBody = 'Muchas gracias por su compra, los detalles fueron enviados a su mail';

    $mail->setLanguage('es','../phpmailer/language/phpmailer.lang-es.php');

    $mail->send();
    //echo 'Message has been sent';
} catch (Exception $e) {
    echo "Error al enviar el Correo. Mailer Error: {$mail->ErrorInfo}";
    //exit;
}
?>