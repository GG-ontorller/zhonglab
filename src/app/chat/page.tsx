import { PublicChatRoom } from "@/components/public-chat-room";

export default function ChatPage() {
  const supabaseReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return <PublicChatRoom supabaseReady={supabaseReady} />;
}
