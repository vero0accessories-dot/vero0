import fs from "fs";
import path from "path";
import { getSupabaseAdmin } from "./supabase.js";

export interface StorageUploadResult {
  url: string;
  error?: string;
}

export async function uploadImageToStorage(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = "products"
): Promise<StorageUploadResult> {
  const fileExt = fileName.split(".").pop() || "png";
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // Self-hosted local storage fallback
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilePath = path.join(process.cwd(), "public", "uploads", uniqueName);
      fs.writeFileSync(localFilePath, buffer);
      return { url: `/uploads/${uniqueName}` };
    } catch (localErr: any) {
      console.error("[Storage] Local file write error:", localErr);
      return { url: "", error: localErr?.message || "Failed to save file to local uploads" };
    }
  }

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-assets")
      .upload(uniqueName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return { url: "", error: uploadError.message };
    }

    const { data } = supabase.storage
      .from("product-assets")
      .getPublicUrl(uploadData.path);

    return { url: data.publicUrl };
  } catch (err: any) {
    console.error("Storage upload exception:", err);
    return { url: "", error: err?.message || "Failed to upload file to storage." };
  }
}
