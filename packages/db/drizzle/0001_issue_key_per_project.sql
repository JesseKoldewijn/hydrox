ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "issues_key_uidx";
--> statement-breakpoint
DROP INDEX IF EXISTS "issues_key_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_key_uidx" ON "issues" USING btree ("project_id","key");
