import { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../utils/errors.js";

const client = new OAuth2Client({
  clientId: process.env.CLIENT_ID,
});

async function verifyToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.CLIENT_ID,
    });

    return ticket.getPayload();
  } catch {
    throw new UnauthorizedError("Invalid Google token");
  }
}

export { verifyToken };