import { describe, it, expect, beforeEach } from "vitest";
import { getEmailProvider, getDevLatestOtp } from "../../lib/auth/email";

describe("Email Provider and Safe Dev Mode", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("sends OTP via mock adapter in non-production", async () => {
    const provider = getEmailProvider();
    const result = await provider.sendOtp({
      to: "test.student@campus.edu",
      otp: "778899",
      type: "registration",
      userName: "Test Student",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");

    // Can retrieve in dev/test mode
    const devOtp = getDevLatestOtp("test.student@campus.edu");
    expect(devOtp).toBe("778899");
  });

  it("never exposes OTP via getDevLatestOtp in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const otp = getDevLatestOtp("test.student@campus.edu");
    expect(otp).toBeNull();
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });
});
