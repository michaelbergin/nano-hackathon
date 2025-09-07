import { SignJWT, jwtVerify } from "jose";

export type AuthTokenPayload = {
  userId: number;
  email: string;
  role: string;
};

const alg = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (secret == null || secret === "") {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(
  payload: AuthTokenPayload,
  expiresIn: string = "7d"
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifyAuthToken(
  token: string
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { userId, email, role } = payload as unknown as AuthTokenPayload;
    if (
      typeof userId !== "number" ||
      typeof email !== "string" ||
      typeof role !== "string"
    ) {
      return null;
    }
    return { userId, email, role };
  } catch {
    return null;
  }
}
