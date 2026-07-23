import { Injectable } from "@nestjs/common";
import { WorkOS } from "@workos-inc/node";

@Injectable()
export class WorkosService {
  private client: WorkOS | null = null;

  isEnabled() {
    return Boolean(process.env.WORKOS_API_KEY && process.env.WORKOS_CLIENT_ID);
  }

  getClient(): WorkOS {
    if (!this.isEnabled()) {
      throw new Error("WorkOS is not configured");
    }
    if (!this.client) {
      this.client = new WorkOS(process.env.WORKOS_API_KEY!);
    }
    return this.client;
  }

  getAuthorizationUrl(state?: string) {
    const client = this.getClient();
    return client.userManagement.getAuthorizationUrl({
      provider: "authkit",
      clientId: process.env.WORKOS_CLIENT_ID!,
      redirectUri:
        process.env.WORKOS_REDIRECT_URI ??
        "http://localhost:3001/trpc/auth.workosCallback",
      state,
    });
  }

  async authenticateWithCode(code: string) {
    const client = this.getClient();
    return client.userManagement.authenticateWithCode({
      clientId: process.env.WORKOS_CLIENT_ID!,
      code,
    });
  }
}
