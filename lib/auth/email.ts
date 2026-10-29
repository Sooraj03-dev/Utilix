// Utilix — Email Provider Abstraction (server-only)
import "server-only";

export interface SendOtpOptions {
  to: string;
  otp: string;
  type: "registration" | "reset_password";
  userName?: string;
}

export interface EmailSendResult {
  success: boolean;
  provider: "resend" | "sendgrid" | "mock";
  error?: string;
  messageId?: string;
}

export interface EmailProvider {
  sendOtp(options: SendOtpOptions): Promise<EmailSendResult>;
}

// In-memory store for local development OTP tracking
const devSentEmails = new Map<
  string,
  { otp: string; type: string; timestamp: number }
>();

/**
 * Safe local development OTP retrieval.
 * Returns null in production environment to prevent exposure.
 */
export function getDevLatestOtp(email: string): string | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const entry = devSentEmails.get(email.trim().toLowerCase());
  return entry ? entry.otp : null;
}

/**
 * Resend Email Adapter
 */
class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private fromEmail: string) {}

  async sendOtp(options: SendOtpOptions): Promise<EmailSendResult> {
    const isRegistration = options.type === "registration";
    const subject = isRegistration
      ? `[Utilix] Verify your campus account (${options.otp})`
      : `[Utilix] Reset your password (${options.otp})`;

    const html = `
      <div style="font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #FFFDF8; border: 2px solid #111; border-radius: 16px;">
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 8px 0; color: #111;">
            UTILIX <span style="font-weight: 500; font-size: 14px; background: #FFD026; padding: 2px 8px; border-radius: 999px; border: 1.5px solid #111;">Campus Resource Sharing</span>
          </h1>
          <p style="margin: 0; color: #555; font-size: 14px;">One campus. Every resource. Fair for everyone.</p>
        </div>

        <div style="background: #FFFFFF; border: 2px solid #111; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 4px 4px 0px #111;">
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #111;">Hello ${options.userName || "Student"},</p>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #333; line-height: 1.5;">
            ${isRegistration
              ? "Use the 6-digit verification code below to complete your Utilix campus registration."
              : "Use the 6-digit verification code below to reset your Utilix password."}
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #111; background: #FFF9D2; padding: 12px 28px; border: 2px dashed #111; border-radius: 12px;">
              ${options.otp}
            </div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #666; font-weight: 600;">Code expires in 5 minutes</p>
          </div>

          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">
            If you did not make this request, you can safely ignore this email. Never share your verification code with anyone.
          </p>
        </div>

        <div style="text-align: center; font-size: 11px; color: #777;">
          <p style="margin: 0;">Utilix Deterministic Allocation & Campus Sharing System</p>
        </div>
      </div>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: options.to,
          subject,
          html,
          text: `Your Utilix verification code is: ${options.otp}. It expires in 5 minutes.`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, provider: "resend", error: `Resend API error: ${errorText}` };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, provider: "resend", messageId: data.id };
    } catch (err) {
      return {
        success: false,
        provider: "resend",
        error: err instanceof Error ? err.message : "Network error contacting Resend API",
      };
    }
  }
}

/**
 * SendGrid Email Adapter
 */
class SendGridEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private fromEmail: string) {}

  async sendOtp(options: SendOtpOptions): Promise<EmailSendResult> {
    const isRegistration = options.type === "registration";
    const subject = isRegistration
      ? `[Utilix] Verify your campus account (${options.otp})`
      : `[Utilix] Reset your password (${options.otp})`;

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: this.fromEmail, name: "Utilix Campus" },
          subject,
          content: [
            {
              type: "text/plain",
              value: `Your Utilix verification code is: ${options.otp}. It expires in 5 minutes.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, provider: "sendgrid", error: `SendGrid error: ${errorText}` };
      }

      return { success: true, provider: "sendgrid" };
    } catch (err) {
      return {
        success: false,
        provider: "sendgrid",
        error: err instanceof Error ? err.message : "SendGrid error",
      };
    }
  }
}

/**
 * Mock Email Adapter for Local Development and Testing
 */
class MockEmailProvider implements EmailProvider {
  async sendOtp(options: SendOtpOptions): Promise<EmailSendResult> {
    const normalizedEmail = options.to.trim().toLowerCase();
    devSentEmails.set(normalizedEmail, {
      otp: options.otp,
      type: options.type,
      timestamp: Date.now(),
    });

    if (process.env.NODE_ENV !== "production") {
      // Safe development console logger with styled banner
      console.log(
        `\n╔═══════════════════════════════════════════════════════════════╗\n` +
        `║  [UTILIX DEV EMAIL ADAPTER]                                  ║\n` +
        `║  To:      ${normalizedEmail.padEnd(51)}║\n` +
        `║  Action:  ${options.type.toUpperCase().padEnd(51)}║\n` +
        `║  Code:    ${options.otp.padEnd(51)}║\n` +
        `║  Expires: 5 minutes                                           ║\n` +
        `╚═══════════════════════════════════════════════════════════════╝\n`
      );
    }

    return {
      success: true,
      provider: "mock",
      messageId: `mock-${Date.now()}`,
    };
  }
}

/**
 * Factory that returns the configured email provider.
 */
export function getEmailProvider(): EmailProvider {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (resendApiKey) {
    return new ResendEmailProvider(resendApiKey, fromEmail);
  }

  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  if (sendGridApiKey) {
    return new SendGridEmailProvider(sendGridApiKey, fromEmail);
  }

  // Development/Test mock provider fallback
  return new MockEmailProvider();
}
