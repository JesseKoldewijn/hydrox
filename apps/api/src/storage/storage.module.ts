import { Inject, Injectable, Module } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { attachments, type HydroxDb } from "@hydrox/db";
import { DB } from "../db/db.module.js";
import { DbModule } from "../db/db.module.js";

@Injectable()
export class StorageService {
  constructor(@Inject(DB) private readonly db: HydroxDb) {}

  async storeAttachment(input: {
    issueId: string;
    uploadedById: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    data: Buffer;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(attachments).values({
      id,
      issueId: input.issueId,
      uploadedById: input.uploadedById,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      data: input.data,
      updatedById: input.uploadedById,
    });
    const [row] = await this.db
      .select({
        id: attachments.id,
        issueId: attachments.issueId,
        uploadedById: attachments.uploadedById,
        fileName: attachments.fileName,
        contentType: attachments.contentType,
        sizeBytes: attachments.sizeBytes,
        version: attachments.version,
        updatedById: attachments.updatedById,
        createdAt: attachments.createdAt,
        updatedAt: attachments.updatedAt,
        deletedAt: attachments.deletedAt,
        deletedById: attachments.deletedById,
      })
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);
    return row!;
  }

  async getAttachment(id: string) {
    const [row] = await this.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), isNull(attachments.deletedAt)))
      .limit(1);
    return row ?? null;
  }
}

@Module({
  imports: [DbModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
