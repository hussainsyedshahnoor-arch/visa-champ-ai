import { useState, useCallback } from "react";

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

  // Guest usage is tracked client-side only. Any server-side accounting is done
  // by the chat edge function with trusted credentials.
  const incrementCount = useCallback(async () => {
    const newCount = messageCount + 1;
    setMessageCount(newCount);
    localStorage.setItem(GUEST_COUNT_KEY, String(newCount));
    if (newCount >= GUEST_MESSAGE_CAP) {
      setShowGate(true);
    }
  }, [messageCount]);

  const dismissGate = useCallback(() => setShowGate(false), []);

  const migrateToUser = useCallback(async (_userId: string) => {
    // Guest chat history is claimed server-side by the chat edge function on the
    // next authenticated request; nothing privileged happens in the browser.
    localStorage.removeItem(GUEST_ID_KEY);
    localStorage.removeItem(GUEST_COUNT_KEY);
  }, []);

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
