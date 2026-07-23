import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { WorkosService } from "./workos.service.js";
import { DbModule } from "../db/db.module.js";
import { PermissionsService } from "./permissions.service.js";

@Module({
  imports: [DbModule],
  providers: [AuthService, WorkosService, PermissionsService],
  exports: [AuthService, WorkosService, PermissionsService],
})
export class AuthModule {}
