import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

// Upload file to Supabase Storage
export async function uploadAttachment(
  file: File,
  taskId: string
): Promise<string | null> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("attachments")
    .upload(fileName, file);

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("attachments")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
