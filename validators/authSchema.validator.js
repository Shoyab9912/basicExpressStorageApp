import * as z from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string("Password is required")
    .min(3, "Password must be at least 3 characters long")
    .max(8, "Password must be at most 8 characters long"),
});

export const registerSchema = loginSchema.extend({
  name: z
    .string("Name is required")
    .min(4, "Name cannot be empty")
    .max(20, "Name must be less than 50 characters long"),
  otp: z.string("OTP is required").regex(/^\d{4}$/),
});

export const sendOTPSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  otp: z.string("OTP is required").regex(/^\d{4}$/),
});
