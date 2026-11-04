"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Chat } from "./api";

type ChatsState = {
  chats: Chat[];
  loaded: boolean;
  /** The conversation open in the chat screen, or null for a fresh one. */
  activeId: number | null;
  setActiveId: (id: number | null) => void;
  /** Bumped by "New chat" so the chat screen clears even when it is already empty. */
  resetKey: number;
  newChat: () => void;
  reload: () => Promise<void>;
  remove: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  /** A question typed on the dashboard, picked up and sent by the chat screen. */
  pendingQuestion: string | null;
  setPendingQuestion: (q: string | null) => void;
  /** Mobile navigation drawer. */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const Ctx = createContext<ChatsState | null>(null);

export function ChatsProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      setChats(await api<Chat[]>("/chats"));
    } catch {
      /* keep the list we have; the next action retries */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo<ChatsState>(
    () => ({
      chats,
      loaded,
      activeId,
      setActiveId,
      resetKey,
      newChat: () => {
        setActiveId(null);
        setResetKey((k) => k + 1);
      },
      reload,
      remove: async (id) => {
        await api(`/chats/${id}`, { method: "DELETE" });
        setActiveId((current) => (current === id ? null : current));
        setResetKey((k) => k + 1);
        await reload();
      },
      clearAll: async () => {
        await api("/chats", { method: "DELETE" });
        setActiveId(null);
        setResetKey((k) => k + 1);
        await reload();
      },
      pendingQuestion,
      setPendingQuestion,
      drawerOpen,
      setDrawerOpen,
    }),
    [chats, loaded, activeId, resetKey, reload, pendingQuestion, drawerOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChats(): ChatsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChats must be used inside <ChatsProvider>");
  return ctx;
}
