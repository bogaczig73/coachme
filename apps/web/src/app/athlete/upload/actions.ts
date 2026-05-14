"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities } from "@betri/db/schema";
import { putFile } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadFit(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a .fit file" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "File is too large (10 MB max)" };
  }
  if (!file.name.toLowerCase().endsWith(".fit")) {
    return { error: "Only .fit files are supported right now" };
  }

  const key = `fit/${session.user.id}/${Date.now()}-${file.name}`;
  const { url } = await putFile(key, file);

  await db.insert(activities).values({
    userId: session.user.id,
    source: "upload",
    sourceFileKey: url,
    sourceFileName: file.name,
    status: "pending",
  });

  revalidatePath("/athlete");
  revalidatePath("/athlete/activities");
  redirect("/athlete/activities");
}
