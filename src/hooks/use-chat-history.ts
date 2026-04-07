import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Msg } from "@/lib/chat-stream";

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useChatHistory(userId: string | undefined) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    setLoadingSessions(true);
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    setSessions((data as ChatSession[]) ?? []);
    setLoadingSessions(false);
  }, [userId]);

  const createSession = useCallback(async (firstMessage: string): Promise<string | null> => {
    if (!userId) return null;
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + "…" : firstMessage;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title })
      .select("id")
      .single();
    if (error || !data) return null;
    const newSession = { id: data.id, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(data.id);
    return data.id;
  }, [userId]);

  const saveMessage = useCallback(async (sessionId: string, msg: Msg) => {
    if (!userId) return;
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
    });
  }, [userId]);

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
