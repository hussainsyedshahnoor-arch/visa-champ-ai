import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "crypto";

const GUEST_ID_KEY = "visa_champ_guest_id";
const GUEST_COUNT_KEY = "visa_champ_guest_count";
const GUEST_MESSAGE_CAP = 5;

function getOrCreateGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function useGuestSession() {
  const [guestId] = useState(() => getOrCreateGuestId());
  const [messageCount, setMessageCount] = useState(() => {
    return parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10);
  });
  const [showGate, setShowGate] = useState(false);

  const isAtCap = messageCount >= GUEST_MESSAGE_CAP;

  const incrementCount = useCallback(async () => {
    const newCount = messageCount + 1;
    setMessageCount(newCount);
    localStorage.setItem(GUEST_COUNT_KEY, String(newCount));

    // Sync to DB
    const { data } = await supabase
      .from("guest_sessions")
      .select("id")
      .eq("guest_id", guestId)
      .maybeSingle();

    if (data) {
      await supabase
        .from("guest_sessions")
        .update({ message_count: newCount })
        .eq("guest_id", guestId);
    } else {
      await supabase
        .from("guest_sessions")
        .insert({ guest_id: guestId, message_count: newCount });
    }

    if (newCount >= GUEST_MESSAGE_CAP) {
      setShowGate(true);
    }
  }, [messageCount, guestId]);

  const dismissGate = useCallback(() => setShowGate(false), []);

  const migrateToUser = useCallback(async (userId: string) => {
    await supabase.rpc("migrate_guest_to_user", {
      _guest_id: guestId,
      _user_id: userId,
    });
    localStorage.removeItem(GUEST_ID_KEY);
    localStorage.removeItem(GUEST_COUNT_KEY);
  }, [guestId]);

  return {
    guestId,
    messageCount,
    isAtCap,
    showGate,
    incrementCount,
    dismissGate,
    migrateToUser,
  };
}
