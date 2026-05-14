import { NextResponse } from "next/server";
import { readLocalFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const path = key.join("/");

  try {
    const buf = await readLocalFile(path);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
