import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "SoiréeSpace <noreply@soireespace.com>";

export async function sendTeamInviteEmail({
  to,
  inviterName,
  teamName,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  teamName: string;
  inviteUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping invite email to:", to);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${inviterName} invited you to join their team on SoiréeSpace`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #1c1917; margin-bottom: 8px;">You're invited!</h2>
        <p style="color: #57534e; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join
          ${teamName ? `the team <strong>${teamName}</strong>` : "their team"} on SoiréeSpace.
        </p>
        <p style="color: #57534e; line-height: 1.6;">
          As a team member, you'll be able to collaborate on assigned weddings and events.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #e11d48; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          Accept Invitation
        </a>
        <p style="color: #a8a29e; font-size: 13px; margin-top: 24px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
