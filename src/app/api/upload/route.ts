import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2, validateImage } from "@/lib/r2";
import { randomUUID } from "crypto";

/**
 * POST /api/upload
 * Accepts multipart/form-data with:
 *   - file: the image file
 *   - folder: storage folder (e.g. "logos", "banners", "products")
 *
 * Returns: { url: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? "misc";

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  // Validate
  const error = validateImage(file.type, file.size);
  if (error) {
    return NextResponse.json({ error }, { status: 422 });
  }

  // Sanitize folder name
  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "").slice(0, 50) || "misc";

  // Generate unique key
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key = `${safeFolder}/${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(key, buffer, file.type);

  return NextResponse.json({ url }, { status: 201 });
}
