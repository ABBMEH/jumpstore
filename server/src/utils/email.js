const nodemailer = require("nodemailer");
// Configuration du transporteur Nodemailer pour Gmail
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});
// Fonction pour envoyer l'email de confirmation
async function sendConfirmationEmail(user, token) {
  const confirmationUrl = `${process.env.CLIENT_URL}/pages/emailconfirmation/emailconfirmation.html?token=${token}`;
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: user.email,
    subject: "Confirmez votre adresse email",
    html: `
      <h1>Bienvenue, ${user.firstname}!</h1>
      <p>Veuillez confirmer votre adresse email en cliquant sur le lien suivant :</p>
      <a href="${confirmationUrl}">Confirmer mon email</a>
      <p>Ce lien expire dans 24 heures.</p>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    throw new Error("Erreur lors de l'envoi de l'email de confirmation: " + err.message);
  }
}
module.exports = { sendConfirmationEmail };