import { z } from "zod";

/**
 * Auth validation schemas using Zod
 *
 * These schemas provide client-side validation for authentication forms.
 * They match the validation rules specified in the auth-spec.md document.
 */

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email address");

// Password validation schema (for signup and reset)
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/\d/, "Password must include at least one number");

// Simple password validation for login (only checks presence)
export const loginPasswordSchema = z.string().min(1, "Password is required");

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

// Signup form schema with password confirmation
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Forgot password form schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password form schema with password confirmation
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Type exports for use in components
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
