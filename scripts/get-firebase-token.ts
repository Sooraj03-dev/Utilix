import { getFirebaseAdminAuth } from "../lib/firebase/admin";

export async function getRealFirebaseIdToken(uid: string): Promise<string> {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) throw new Error("Firebase Admin Auth not initialized");

  const customToken = await adminAuth.createCustomToken(uid);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await res.json();
  if (!data.idToken) {
    throw new Error(`Failed to exchange custom token: ${JSON.stringify(data)}`);
  }

  return data.idToken;
}

if (import.meta.url.endsWith(process.argv[1] || "")) {
  getRealFirebaseIdToken("student-01")
    .then((token) => console.log("Real ID Token received! Length:", token.length))
    .catch(console.error);
}
