import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const LOCAL_DIR = path.resolve(process.cwd(), "storage");

export async function putFile(
  key: string,
  data: File | Buffer,
  contentType = "application/octet-stream",
): Promise<{ url: string }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, data, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return { url: blob.url };
  }

  const fullPath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  const buf =
    data instanceof File ? Buffer.from(await data.arrayBuffer()) : data;

  await fs.writeFile(fullPath, buf);

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return { url: `${base}/api/storage/${key}` };
}

export async function readLocalFile(key: string): Promise<Buffer> {
  const fullPath = path.join(LOCAL_DIR, key);
  return fs.readFile(fullPath);
}
