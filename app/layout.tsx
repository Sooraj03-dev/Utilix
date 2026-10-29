import { AuthShell } from "../components/auth-shell";
import { AuthProvider } from "../lib/auth/context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthShell>{children}</AuthShell>
        </AuthProvider>
      </body>
    </html>
  );
}
