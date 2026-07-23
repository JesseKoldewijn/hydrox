import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import {
  projectMemberships,
  projectPermissionOverrides,
  customRoles,
  type HydroxDb,
} from "@hydrox/db";
import {
  resolveCapabilities,
  hasCapability,
  type Capability,
} from "@hydrox/domain";
import { DB } from "../db/db.module.js";

@Injectable()
export class PermissionsService {
  constructor(@Inject(DB) private readonly db: HydroxDb) {}

  async getProjectCapabilities(
    userId: string,
    projectId: string,
  ): Promise<Set<Capability>> {
    const [membership] = await this.db
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId),
          isNull(projectMemberships.deletedAt),
        ),
      )
      .limit(1);

    const [override] = await this.db
      .select()
      .from(projectPermissionOverrides)
      .where(
        and(
          eq(projectPermissionOverrides.projectId, projectId),
          eq(projectPermissionOverrides.userId, userId),
        ),
      )
      .limit(1);

    let customCaps: Capability[] = [];
    if (override?.customRoleId) {
      const [role] = await this.db
        .select()
        .from(customRoles)
        .where(eq(customRoles.id, override.customRoleId))
        .limit(1);
      customCaps = (role?.capabilities ?? []) as Capability[];
    }

    return resolveCapabilities({
      projectRole: membership?.role ?? null,
      overrides: (override?.capabilities ?? []) as Capability[],
      customRoleCapabilities: customCaps,
    });
  }

  async assert(
    userId: string,
    projectId: string,
    capability: Capability,
  ): Promise<void> {
    const caps = await this.getProjectCapabilities(userId, projectId);
    if (!hasCapability(caps, capability)) {
      throw new Error(`Missing capability: ${capability}`);
    }
  }
}
