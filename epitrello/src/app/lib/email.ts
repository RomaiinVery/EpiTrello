import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "onboarding@resend.dev"; // Default for testing. Replace with verified domain later.

export const sendInvitationEmail = async (
  to: string,
  inviterName: string,
  workspaceTitle: string,
  inviteLink: string
) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Invitation à rejoindre le workspace "${workspaceTitle}" sur EpiTrello`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Vous avez été invité !</h2>
          <p>Bonjour,</p>
          <p><strong>${inviterName}</strong> vous a invité à rejoindre le workspace <strong>"${workspaceTitle}"</strong> sur EpiTrello.</p>
          <p>En acceptant cette invitation, vous aurez accès à tous les boards de ce workspace.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accéder au workspace
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Si vous ne possédez pas encore de compte, vous devrez en créer un avec cette adresse email (${to}).</p>
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

  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not defined. Email will not be sent via Resend API.");
    return true; // Simulate success
  }

  try {
    const { error } = await resend.emails.send({
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

    if (error) {
      console.error("Resend API Error:", error);
      return false;
    }

    console.log(`Email de vérification envoyé à ${to}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi du code de vérification:", error);
    return false;
  }
};
