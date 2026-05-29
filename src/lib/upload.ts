import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function uploadRecipePhoto(file: File, userId: string): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error("Formato no soportado (usa JPG, PNG, WEBP)");
  if (file.size > MAX_BYTES) throw new Error("Imagen demasiado grande (máx 5 MB)");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("recipe-photos").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("recipe-photos").getPublicUrl(path);
  return data.publicUrl;
}
