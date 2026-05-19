"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/lib/context";

export interface APITable {
  id:           string;
  table_number: number;
  name:         string | null;
  seats:        number;
  status:       "free" | "active" | "waiting";
  qr_url:       string | null;
  qr_data_url:  string | null;
  menu_url:     string;
  created_at:   string;
}

export interface UseTablesDataReturn {
  tables:        APITable[];
  isLoading:     boolean;
  error:         string | null;
  refetch:       () => void;
  createTable:   (tableNumber: number, name?: string, seats?: number) => Promise<APITable | null>;
  deleteTable:   (id: string) => Promise<boolean>;
  regenerateQR:  (id: string) => Promise<APITable | null>;
  updateStatus:  (id: string, status: APITable["status"]) => Promise<boolean>;
}

const POLL_INTERVAL = 15_000; // 15 s — live table status

export function useTablesData(): UseTablesDataReturn {
  const { state } = useApp();
  const [tables,    setTables]    = useState<APITable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTables = useCallback(async () => {
    if (!state.auth?.role) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/tables", { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      if (!res.ok) { const j = await res.json().catch(()=>({})) as {message?:string}; throw new Error(j.message ?? `HTTP ${res.status}`); }
      const json = await res.json() as { data: APITable[] };
      if (!ctrl.signal.aborted) setTables(json.data ?? []);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [state.auth?.role, tick]);

  useEffect(() => { fetchTables(); return () => abortRef.current?.abort(); }, [fetchTables]);

  // Auto-poll for live status changes (orders arriving from guests)
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const createTable = useCallback(async (tableNumber: number, name?: string, seats = 4): Promise<APITable | null> => {
    try {
      const res  = await fetch("/api/tables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_number: tableNumber, name, seats }) });
      const json = await res.json() as { data?: APITable };
      if (!res.ok || !json.data) return null;
      setTables(prev => [...prev, json.data!].sort((a,b) => a.table_number - b.table_number));
      return json.data;
    } catch { return null; }
  }, []);

  const deleteTable = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
      if (!res.ok) return false;
      setTables(prev => prev.filter(t => t.id !== id));
      return true;
    } catch { return false; }
  }, []);

  const regenerateQR = useCallback(async (id: string): Promise<APITable | null> => {
    try {
      const res  = await fetch(`/api/tables/${id}/qr`, { method: "POST" });
      const json = await res.json() as { data?: { qr_url:string|null; qr_data_url:string|null; menu_url:string } };
      if (!res.ok || !json.data) return null;
      setTables(prev => prev.map(t => t.id === id ? { ...t, ...json.data! } : t));
      return tables.find(t => t.id === id) ?? null;
    } catch { return null; }
  }, [tables]);

  // Update table status in DB and optimistically in local state
  const updateStatus = useCallback(async (id: string, status: APITable["status"]): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      if (!res.ok) return false;
      setTables(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      return true;
    } catch { return false; }
  }, []);

  return { tables, isLoading, error, refetch: () => setTick(n => n + 1), createTable, deleteTable, regenerateQR, updateStatus };
}
