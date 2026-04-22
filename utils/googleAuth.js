import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client({
    clientId: process.env.CLIENT_ID
})



async function verifyToken(token) {
    try {
        const decoded = await client.verifyIdToken({
            idToken: token,
            audience: process.env.CLIENT_ID
        })
        const data = decoded.getPayload()
        return data
    } catch (error) {
        console.error("Error verifying token:", error);
        throw new Error("Invalid token");
    }
}

export { verifyToken }