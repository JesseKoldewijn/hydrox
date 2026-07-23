import { Module } from "@nestjs/common";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    this.bucket = process.env.S3_BUCKET ?? "hydrox";
    this.client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "test",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "test",
      },
    });
  }

  objectKey(parts: {
    organizationId: string;
    projectId: string;
    issueId: string;
    fileName: string;
  }) {
    const safe = parts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `org/${parts.organizationId}/project/${parts.projectId}/issue/${parts.issueId}/${crypto.randomUUID()}-${safe}`;
  }

  async presignUpload(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: 900 });
  }

  async presignDownload(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 900 });
  }
}

@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
