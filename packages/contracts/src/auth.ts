import { z } from "zod";
import { entityIdSchema, orgRoleSchema } from "./common.js";

export const identityProviderSchema = z.enum(["password", "workos"]);

export const registerInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(120).optional(),
});

export const loginInputSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const sessionUserSchema = z.object({
  id: entityIdSchema,
  email: z.string().email(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authProviderSchema = z.object({
  provider: identityProviderSchema,
  externalId: z.string().nullable(),
});

export const workosCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

export const createOrganizationInputSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/),
});

export const inviteMemberInputSchema = z.object({
  organizationId: entityIdSchema,
  email: z.string().email(),
  role: orgRoleSchema.default("member"),
});
