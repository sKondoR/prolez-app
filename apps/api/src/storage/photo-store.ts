import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/** Хранилище файлов фото. В тестах подменяется памятью, в разработке и проде — S3 (MinIO). */
export interface PhotoStore {
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
}

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function createS3PhotoStore(config: S3Config) {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    // MinIO адресует бакеты путём, а не поддоменом.
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const Bucket = config.bucket;

  const store: PhotoStore & { ensureBucket(): Promise<void> } = {
    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        if (!res.Body) return null;
        return {
          body: await res.Body.transformToByteArray(),
          contentType: res.ContentType ?? 'application/octet-stream',
        };
      } catch (err) {
        if (err instanceof NoSuchKey) return null;
        throw err;
      }
    },
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },
    async ensureBucket() {
      try {
        await client.send(new HeadBucketCommand({ Bucket }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket }));
      }
    },
  };
  return store;
}

export function createMemoryPhotoStore(): PhotoStore {
  const files = new Map<string, { body: Uint8Array; contentType: string }>();
  return {
    get: async (key) => files.get(key) ?? null,
    put: async (key, body, contentType) => {
      files.set(key, { body, contentType });
    },
  };
}
