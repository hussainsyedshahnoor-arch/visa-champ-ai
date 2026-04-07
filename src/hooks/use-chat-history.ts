import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Msg } from "@/lib/chat-stream";

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useChatHistory(userId: string | undefined, guestId?: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    setLoadingSessions(true);
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    setSessions((data as ChatSession[]) ?? []);
    setLoadingSessions(false);
  }, [userId]);

  const createSession = useCallback(async (firstMessage: string): Promise<string | null> => {
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + "…" : firstMessage;

    const insertData: Record<string, any> = { title };
    if (userId) {
      insertData.user_id = userId;
    } else if (guestId) {
      insertData.guest_id = guestId;
    } else {
      return null;
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert(insertData)
      .select("id")
      .single();
    if (error || !data) return null;

    const newSession = { id: data.id, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(data.id);
    return data.id;
  }, [userId, guestId]);

  const saveMessage = useCallback(async (sessionId: string, msg: Msg) => {
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
    });
  }, []);

  const loadSession = useCallback(async (sessionId: string): Promise<Msg[]> => {
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setActiveSessionId(sessionId);
    return (data as Msg[]) ?? [];
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await supabase.from("chat_sessions").delete().eq("id", sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) setActiveSessionId(null);
  }, [activeSessionId]);

  const clearActive = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  return {
    sessions,
    activeSessionId,
    loadingSessions,
    fetchSessions,
    createSession,
    saveMessage,
    loadSession,
    deleteSession,
    clearActive,
  };
}
