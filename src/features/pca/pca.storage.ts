import { createHash } from 'node:crypto'
import { uploadObject } from '@/lib/storage'

export interface PcaStoredSource {
  hashSha256: string
  tamanhoBytes: number
  objectKey: string | null
  inlineContent: Buffer | null
  storageMode: 's3' | 'database' | 'memory'
}

export async function storePcaSource(buffer: Buffer, fileName: string, jobId: string): Promise<PcaStoredSource> {
  const hashSha256 = createHash('sha256').update(buffer).digest('hex')
  const maxInlineBytes = Number(process.env.PCA_MAX_INLINE_BYTES || 8 * 1024 * 1024)
  const bucket = process.env.MINIO_BUCKET || process.env.PCA_STORAGE_BUCKET
  const endpoint = process.env.MINIO_ENDPOINT

  if (bucket && endpoint) {
    const objectKey = `pca-matcher/${jobId}/${hashSha256}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    try {
      await uploadObject(bucket, objectKey, buffer, 'application/octet-stream')
      return { hashSha256, tamanhoBytes: buffer.length, objectKey, inlineContent: null, storageMode: 's3' }
    } catch (error) {
      console.warn('[pca] Falha no armazenamento S3/MinIO; usando fallback local.', error)
    }
  }

  if (buffer.length <= maxInlineBytes) {
    return { hashSha256, tamanhoBytes: buffer.length, objectKey: null, inlineContent: buffer, storageMode: 'database' }
  }

  return { hashSha256, tamanhoBytes: buffer.length, objectKey: null, inlineContent: null, storageMode: 'memory' }
}
