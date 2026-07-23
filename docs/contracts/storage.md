# Storage

Attachment bytes are stored in MySQL (`attachments.data` LONGBLOB).

Upload/download via tRPC:

- `work.uploadAttachment` — base64 payload + metadata
- `work.attachmentDownload` — returns base64 + content type

No external object store (S3 / LocalStack) in the default stack.
