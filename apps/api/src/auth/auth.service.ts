import { createHash, randomBytes } from "node:crypto";
import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { eq, or } from "drizzle-orm";
import {
  users,
  identities,
  sessions,
  organizations,
  organizationMemberships,
  workspaces,
  workspaceMemberships,
  type HydroxDb,
} from "@hydrox/db";
import { DB } from "../db/db.module.js";
import type {
  LoginInput,
  RegisterInput,
  SessionUser,
} from "./auth.types.js";

const SESSION_DAYS = 14;

@Injectable()
export class AuthService {
  constructor(@Inject(DB) private readonly db: HydroxDb) {}

  async register(input: RegisterInput): Promise<{ user: SessionUser; token: string }> {
    const passwordHash = await argon2.hash(input.password);
    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const orgName = input.organizationName ?? `${input.displayName}'s Org`;
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "org";

    await this.db.insert(users).values({
      id: userId,
      email: input.email.toLowerCase(),
      username: input.username,
      displayName: input.displayName,
      passwordHash,
    });
    await this.db.insert(identities).values({
      userId,
      provider: "password",
      externalId: userId,
    });
    await this.db.insert(organizations).values({
      id: orgId,
      name: orgName,
      slug: `${slug}-${userId.slice(0, 6)}`,
      updatedById: userId,
    });
    await this.db.insert(organizationMemberships).values({
      organizationId: orgId,
      userId,
      role: "owner",
    });
    await this.db.insert(workspaces).values({
      id: workspaceId,
      organizationId: orgId,
      name: "Default",
      key: "DEFAULT",
      updatedById: userId,
    });
    await this.db.insert(workspaceMemberships).values({
      workspaceId,
      userId,
      role: "admin",
    });

    const token = await this.createSession(userId);
    return { user: await this.toSessionUser(userId), token };
  }

  async login(input: LoginInput): Promise<{ user: SessionUser; token: string }> {
    const login = input.login.toLowerCase();
    const [row] = await this.db
      .select()
      .from(users)
      .where(or(eq(users.email, login), eq(users.username, input.login)))
      .limit(1);
    if (!row?.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await argon2.verify(row.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    const token = await this.createSession(row.id);
    return {
      user: {
        id: row.id,
        email: row.email,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
      token,
    };
  }

  async logout(token: string) {
    const hash = hashToken(token);
    await this.db.delete(sessions).where(eq(sessions.tokenHash, hash));
  }

  async userFromToken(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const hash = hashToken(token);
    const [row] = await this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.tokenHash, hash))
      .limit(1);
    if (!row) return null;
    if (row.expiresAt.getTime() < Date.now()) {
      await this.db.delete(sessions).where(eq(sessions.tokenHash, hash));
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    };
  }

  /**
   * Upsert a WorkOS-authenticated user into the unified user table.
   */
  async upsertWorkosUser(input: {
    workosUserId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    workosOrganizationId?: string | null;
  }): Promise<{ user: SessionUser; token: string }> {
    const [identity] = await this.db
      .select()
      .from(identities)
      .where(eq(identities.externalId, input.workosUserId))
      .limit(1);

    let userId = identity?.userId;
    if (!userId) {
      const [existing] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);
      if (existing) {
        userId = existing.id;
        await this.db.insert(identities).values({
          userId,
          provider: "workos",
          externalId: input.workosUserId,
        });
      } else {
        userId = crypto.randomUUID();
        const username =
          input.email.split("@")[0]?.replace(/[^a-zA-Z0-9_-]/g, "") ||
          `user_${userId.slice(0, 8)}`;
        await this.db.insert(users).values({
          id: userId,
          email: input.email.toLowerCase(),
          username: `${username}_${userId.slice(0, 4)}`,
          displayName:
            [input.firstName, input.lastName].filter(Boolean).join(" ") ||
            input.email,
        });
        await this.db.insert(identities).values({
          userId,
          provider: "workos",
          externalId: input.workosUserId,
        });
      }
    }

    if (input.workosOrganizationId) {
      const [org] = await this.db
        .select()
        .from(organizations)
        .where(eq(organizations.workosOrganizationId, input.workosOrganizationId))
        .limit(1);
      if (org) {
        const [mem] = await this.db
          .select()
          .from(organizationMemberships)
          .where(eq(organizationMemberships.userId, userId))
          .limit(1);
        if (!mem) {
          await this.db.insert(organizationMemberships).values({
            organizationId: org.id,
            userId,
            role: "member",
          });
        }
      }
    }

    const token = await this.createSession(userId);
    return { user: await this.toSessionUser(userId), token };
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
    await this.db.insert(sessions).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });
    return token;
  }

  private async toSessionUser(userId: string): Promise<SessionUser> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new UnauthorizedException();
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    };
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type { LoginInput, RegisterInput, SessionUser };
