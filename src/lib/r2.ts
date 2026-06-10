import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const BUCKET = process.env.R2_BUCKET_CHAMOU!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL_CHAMOU!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/** Upload a buffer to R2 and return the public URL */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

/** Delete a file from R2 by its public URL or key */
export async function deleteFromR2(urlOrKey: string): Promise<void> {
  const key = urlOrKey.startsWith("http") ? urlOrKey.replace(`${PUBLIC_URL}/`, "") : urlOrKey;
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Validate image file type and size */
export function validateImage(type: string, sizeBytes: number, maxMb = 5): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(type)) return "Formato não suportado. Use JPEG, PNG ou WebP.";
  if (sizeBytes > maxMb * 1024 * 1024) return `Imagem muito grande. Máximo ${maxMb}MB.`;
  return null;
}
