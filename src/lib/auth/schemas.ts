import { z } from "zod";

/**
 * Auth validation schemas using Zod
 *
 * These schemas provide client-side validation for authentication forms.
 * They match the validation rules specified in the auth-spec.md document.
 */

type Translate = (key: string) => string;

const createEmailSchema = (t: Translate) =>
  z.string().trim().toLowerCase().min(1, t("auth.validation.emailRequired")).email(t("auth.validation.emailInvalid"));

const createPasswordSchema = (t: Translate) =>
  z.string().min(8, t("auth.validation.passwordMin")).regex(/\d/, t("auth.validation.passwordNumber"));

const createLoginPasswordSchema = (t: Translate) => z.string().min(1, t("auth.validation.passwordRequired"));

export const createLoginSchema = (t: Translate) =>
  z.object({
    email: createEmailSchema(t),
    password: createLoginPasswordSchema(t),
  });

export const createSignupSchema = (t: Translate) =>
  z
    .object({
      email: createEmailSchema(t),
      password: createPasswordSchema(t),
      confirmPassword: z.string().min(1, t("auth.validation.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });

export const createForgotPasswordSchema = (t: Translate) =>
  z.object({
    email: createEmailSchema(t),
  });

export const createResetPasswordSchema = (t: Translate) =>
  z
    .object({
      password: createPasswordSchema(t),
      confirmPassword: z.string().min(1, t("auth.validation.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
export type SignupFormData = z.infer<ReturnType<typeof createSignupSchema>>;
export type ForgotPasswordFormData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
export type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>;
