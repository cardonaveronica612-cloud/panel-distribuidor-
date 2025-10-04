// index.js
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cron = require('node-cron');
const ngrok = require('ngrok');

const app = express();
app.use(bodyParser.json());

// Twilio config
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Lista de empleados con sus números
let empleados = [
  { nombre: 'Empleado 1', numero: '+5213311111111' },
  { nombre: 'Empleado 2', numero: '+5213322222222' },
  { nombre: 'Empleado 3', numero: '+5213333333333' },
  { nombre: 'Empleado 4', numero: '+5213344444444' },
  { nombre: 'Empleado 5', numero: '+5213355555555' },
  { nombre: 'Empleado 6', numero: '+5213366666666' },
  { nombre: 'Empleado 7', numero: '+5213377777777' },
  { nombre: 'Empleado 8', numero: '+5213388888888' }
];

// Endpoint para enviar un SMS individual
app.post('/sendSMS', async (req, res) => {
  const { number, message } = req.body;
  try {
    const sms = await client.messages.create({
      body: message,
      from: twilioNumber,
      to: number
    });
    res.json({ status: 'ok', number, message, sid: sms.sid });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Endpoint para enviar ronda de SMS masiva
app.post('/sendBulkSMS', async (req, res) => {
  const { numbers, message } = req.body; // numbers = array de números
  let results = [];
  for (let number of numbers) {
    try {
      const sms = await client.messages.create({
        body: message,
        from: twilioNumber,
        to: number
      });
      results.push({ number, sid: sms.sid, status: 'ok' });
    } catch (err) {
      results.push({ number, status: 'error', error: err.message });
    }
  }
  res.json(results);
});

// Endpoint IVR para Twilio Voice
app.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    numDigits: 1,
    action: '/gather',
    method: 'POST'
  });
  gather.say('Bienvenido. Presiona 1 para ventas, 2 para soporte, 3 para información general.');
  res.type('text/xml');
  res.send(twiml.toString());
});

// Endpoint que procesa la opción del IVR
app.post('/gather', (req, res) => {
  const digit = req.body.Digits;
  const empleadoIndex = (parseInt(digit) - 1) % empleados.length;
  const empleado = empleados[empleadoIndex];

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(`Conectando con ${empleado.nombre}`);
  twiml.dial(empleado.numero);
  res.type('text/xml');
  res.send(twiml.toString());
});

// Endpoint para ver empleados (opcional)
app.get('/empleados', (req, res) => {
  res.json(empleados);
});

// Programar ronda automática de SMS cada 2 horas
cron.schedule('0 */2 * * *', async () => {
  const message = 'Telcel .10/02 12:33hrs. tiene nuevas promociones para ti. Comunícate de inmediato al (55)97712700';
  const numbers = empleados.map(e => e.numero); // ejemplo, enviar a todos los empleados
  for (let number of numbers) {
    try {
      await client.messages.create({ body: message, from: twilioNumber, to: number });
      console.log('SMS enviado a', number);
    } catch (err) {
      console.log('Error enviando SMS a', number, err.message);
    }
  }
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Mediador corriendo en puerto ${PORT}`);

  // Iniciar Ngrok para exponer públicamente
  const url = await ngrok.connect(PORT);
  console.log('Tu mediador ahora es público en:', url);
});
