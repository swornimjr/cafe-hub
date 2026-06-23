import { Resend } from 'resend';

let _resend;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail({ to, subject, text, attachments = [] }) {
  const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const payload = {
    from: `Cafe Hub <${FROM}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
  };

  if (attachments.length) {
    payload.attachments = attachments.map(a => ({
      filename: a.filename,
      content: a.content,
    }));
  }

  const { error } = await getResend().emails.send(payload);
  if (error) throw new Error(error.message);
}
