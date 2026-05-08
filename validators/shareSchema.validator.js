import * as z from "zod";


export const shareSchema = z.object({
    email: z.email({ message: "Invalid email address" }),
    permission: z.enum(["viewer", "editor"], { message: "Permission must be either 'viewer' or 'editor'" }),
})