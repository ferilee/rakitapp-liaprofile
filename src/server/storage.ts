import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const bucket = process.env.RUSTFS_BUCKET ?? "lia-assets";
const endpoint = process.env.RUSTFS_ENDPOINT ?? "http://localhost:9000";

export const storage = new S3Client({
  region: "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.RUSTFS_ACCESS_KEY ?? "liaadmin",
    secretAccessKey: process.env.RUSTFS_SECRET_KEY ?? "liaphysicssecret",
  },
});

async function ensureBucket() {
  try {
    await storage.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await storage.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function uploadAsset(file: File) {
  await ensureBucket();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const key = `uploads/${crypto.randomUUID()}.${extension}`;
  await storage.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type || "application/octet-stream",
    }),
  );
  return key;
}

export async function readAsset(key: string) {
  return storage.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
