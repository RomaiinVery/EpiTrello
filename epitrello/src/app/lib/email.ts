import nodemailer from "nodemailer";

export const sendInvitationEmail = async (
  to: string,
  inviterName: string,
  tableauTitle: string,
  inviteLink: string
) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"EpiTrello" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `Invitation à rejoindre le tableau "${tableauTitle}" sur EpiTrello`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Vous avez été invité !</h2>
        <p>Bonjour,</p>
        <p><strong>${inviterName}</strong> vous a invité à rejoindre le tableau <strong>"${tableauTitle}"</strong> sur EpiTrello.</p>
        <p>En acceptant cette invitation, vous aurez accès à tous les boards de ce tableau.</p>
        <div style="margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Accéder au tableau
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Si vous ne possédez pas encore de compte, vous devrez en créer un avec cette adresse email (${to}).</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email d'invitation envoyé à ${to}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return false;
  }
};


