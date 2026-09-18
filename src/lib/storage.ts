// Cliente compartilhado para armazenamento S3-compatível (MinIO).

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

function getStorageClient() {
  const endpoint = process.env.MINIO_ENDPOINT?.trim()

  if (!endpoint) {
    throw new Error('MINIO_ENDPOINT não configurado.')
  }

  const accessKeyId = process.env.MINIO_ACCESS_KEY
  const secretAccessKey = process.env.MINIO_SECRET_KEY

  return new S3Client({
    endpoint: endpoint.replace(/\/$/, ''),
    region: process.env.MINIO_REGION || 'us-east-1',
    forcePathStyle: true,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  })
}

export async function uploadObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType?: string,
): Promise<void> {
  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ...(contentType ? { ContentType: contentType } : {}),
    }),
  )
}

export async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await getStorageClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    const name = (error as { name?: string }).name

    if (statusCode === 404 || name === 'NotFound' || name === 'NoSuchKey') {
      return false
    }

    throw error
  }
}

export async function getObjectMetadata(
  bucket: string,
  key: string,
): Promise<{ size: number; etag?: string } | null> {
  try {
    const response = await getStorageClient().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    )

    if (response.ContentLength === undefined) {
      return null
    }

    return {
      size: response.ContentLength,
      ...(response.ETag ? { etag: response.ETag } : {}),
    }
  } catch (error) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    const name = (error as { name?: string }).name

    if (statusCode === 404 || name === 'NotFound' || name === 'NoSuchKey') {
      return null
    }

    throw error
  }
}

export async function getObject(bucket: string, key: string): Promise<Buffer> {
  const response = await getStorageClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  )

  if (!response.Body) {
    throw new Error(`Objeto S3 sem conteúdo: ${bucket}/${key}`)
  }

  return Buffer.from(await response.Body.transformToByteArray())
}
