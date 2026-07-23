# Storage

S3-compatible object storage.

- Local/CI: LocalStack / openstack port (`S3_ENDPOINT`)
- Prod: AWS S3

Key layout: `org/{orgId}/project/{projectId}/issue/{issueId}/{uuid}-{filename}`

Presigned upload/download via API.
