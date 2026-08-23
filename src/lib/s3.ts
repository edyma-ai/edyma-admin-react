import { api } from '@/api/client'

/**
 * `s3://bucket/key` references as master content and TLM sections carry them.
 * Resolved through `/files/download-url` so the bucket stays private; the
 * presigned URL is cached per key for the life of the page.
 */

const S3_PREFIX = 's3://'

export function isS3Uri(uri: string): boolean {
  return uri.startsWith(S3_PREFIX)
}

export function s3UriToKey(uri: string): string {
  const withoutScheme = uri.slice(S3_PREFIX.length)
  const slashIdx = withoutScheme.indexOf('/')
  return slashIdx < 0 ? withoutScheme : withoutScheme.slice(slashIdx + 1)
}

const s3UrlCache = new Map<string, string>()

export async function resolveS3Url(s3Uri: string): Promise<string> {
  const key = s3UriToKey(s3Uri)
  const cached = s3UrlCache.get(key)
  if (cached) return cached
  const { data } = await api.get<{ download_url: string }>('/api/v1/files/download-url', { params: { key } })
  s3UrlCache.set(key, data.download_url)
  return data.download_url
}
