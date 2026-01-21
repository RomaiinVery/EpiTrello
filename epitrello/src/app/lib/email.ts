import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || '"EpiTrello" <no-reply@epitrello.com>';

export const sendInvitationEmail = async (
  to: string,
  inviterName: string,
  workspaceTitle: string,
  inviteLink: string,
  role: string
) => {
  // ALWAYS Log code to console for development/debugging 
  console.log("==================================================");
  console.log("📨 INVITE LINK: " + inviteLink);
  console.log("Role: " + role);
  console.log("Sent to: " + to);
  console.log("==================================================");

  if (!process.env.SMTP_HOST) {
    console.warn("⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.");
    return true; // Simulate success
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `Invitation à rejoindre le workspace "${workspaceTitle}" sur EpiTrello`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Vous avez été invité !</h2>
          <p>Bonjour,</p>
          <p><strong>${inviterName}</strong> vous a invité à rejoindre le workspace <strong>"${workspaceTitle}"</strong> en tant que <strong>${role === 'EDITOR' ? 'Éditeur' : 'Observateur'}</strong> sur EpiTrello.</p>
          <p>En acceptant cette invitation, vous aurez accès à ce workspace.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accepter l'invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Si vous ne possédez pas encore de compte, vous devrez en créer un ou vous connecter.</p>
        </div>
      `,
    });
    console.log(`Email d'invitation envoyé à ${to}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return false;
  }
};

export const sendVerificationCode = async (to: string, code: string) => {
  // ALWAYS Log code to console for development/debugging 
  console.log("==================================================");
  console.log("🔐 VERIFICATION CODE: " + code);
  console.log("Sent to: " + to);
  console.log("==================================================");

  if (!process.env.SMTP_HOST) {
    console.warn("⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.");
    return true; // Simulate success
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: "Vérifiez votre adresse email - EpiTrello",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; text-align: center;">Vérification de votre compte</h2>
          <p>Bonjour,</p>
          <p>Merci de vous être inscrit sur EpiTrello. Pour valider votre compte, veuillez utiliser le code de vérification ci-dessous :</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${code}</span>
          </div>
          <p>Ce code est valable pendant 10 minutes.</p>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 40px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        </div>
      `,
    });

    console.log(`Email de vérification envoyé à ${to}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi du code de vérification:", error);
    return false;
  }
};


export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  // ALWAYS Log code to console for development/debugging 
  console.log("==================================================");
  console.log("🔑 RESET LINK: " + resetLink);
  console.log("Sent to: " + to);
  console.log("==================================================");

  if (!process.env.SMTP_HOST) {
    console.warn("⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.");
    return true; // Simulate success
  }


  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: "Réinitialisation de votre mot de passe - EpiTrello",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; text-align: center;">Réinitialisation de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe EpiTrello. Cliquez sur le lien ci-dessous pour en définir un nouveau :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p>Ce lien est valable pendant 1 heure.</p>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 40px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        </div>
      `,
    });

    console.log(`Email de réinitialisation envoyé à ${to}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de réinitialisation:", error);
    return false;
  }
};

export const sendEmailChangeVerification = async (to: string, code: string) => {
  console.log("==================================================");
  console.log("📧 EMAIL CHANGE CODE: " + code);
  console.log("Sent to: " + to);
  console.log("==================================================");

  if (!process.env.SMTP_HOST) {
    console.warn("⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.");
    return true;
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: "Vérification de votre nouvelle adresse email - EpiTrello",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; text-align: center;">Changement d'email</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé à changer votre adresse email sur EpiTrello. Pour confirmer cette modification, veuillez utiliser le code ci-dessous :</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${code}</span>
          </div>
          <p>Ce code est valable pendant 10 minutes.</p>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 40px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        </div>
      `,
    });
    console.log(`Email de confirmation de changement d'email envoyé à ${to}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi du code:", error);
    return false;
  }
};
