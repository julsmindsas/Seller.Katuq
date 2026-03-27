/**
 * Ruta Express para POST /v1/notifications/send
 *
 * Uso en tu app Express:
 *   const notificationsRouter = require('./notifications-send.route');
 *   app.use('/v1/notifications', notificationsRouter);
 */

const express = require('express');
const { sendNotificationEmail } = require('./notifications-send.handler');

const router = express.Router();

/**
 * Middleware que obtiene el email del usuario autenticado (ajusta según tu auth)
 * Si usas JWT con payload { email }, o req.user.email, descomenta y adapta.
 */
function getAuthEmail(req) {
  if (req.user && req.user.email) return req.user.email;
  if (req.auth && req.auth.email) return req.auth.email;
  if (req.headers['x-user-email']) return req.headers['x-user-email'];
  return undefined;
}

/**
 * POST /send
 * Body: { type: 'email', toEmail?: string, notification: { type, data, template: { title, message } } }
 */
async function postSend(req, res) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ok: false, error: 'Body must be a JSON object' });
    }

    const recipientFromAuth = getAuthEmail(req);
    const result = await sendNotificationEmail(body, recipientFromAuth);

    if (!result.success) {
      const status = result.error && result.error.includes('recipient') ? 400 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }

    return res.status(200).json({
      ok: true,
      to: result.to,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error('POST /v1/notifications/send error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

router.post('/send', postSend);

module.exports = router;
module.exports.postSend = postSend;
module.exports.getAuthEmail = getAuthEmail;
