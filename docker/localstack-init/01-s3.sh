#!/bin/sh
awslocal s3 mb s3://hydrox || true
echo "S3 bucket hydrox ready"
