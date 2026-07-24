import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { DbModule } from "../db/db.module.js";
import { PermissionsService } from "./permissions.service.js";

@Module({
  imports: [DbModule],
  providers: [AuthService, PermissionsService],
  exports: [AuthService, PermissionsService],
})
export class AuthModule {}
