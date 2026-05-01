import { create } from "zustand";
import {
  createWorkItem as apiCreate,
  deleteWorkItem as apiDelete,
  listWorkItems as apiList,
  updateWorkItem as apiUpdate,
} from "../api/workItems";
import type { WorkItem, WorkItemInput } from "../types";

interface WorkItemStoreState {
  items: WorkItem[];
  isLoading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  create: (input: WorkItemInput) => Promise<WorkItem>;
  update: (id: string, input: WorkItemInput) => Promise<WorkItem>;
  remove: (id: string) => Promise<void>;
}

export const useWorkItemStore = create<WorkItemStoreState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await apiList();
      set({ items, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to load work items",
      });
    }
  },

  create: async (input) => {
    const created = await apiCreate(input);
    set({ items: [created, ...get().items] });
    return created;
  },

  update: async (id, input) => {
    const updated = await apiUpdate(id, input);
    set({
      items: get().items.map((item) => (item.id === id ? updated : item)),
    });
    return updated;
  },

  remove: async (id) => {
    await apiDelete(id);
    set({ items: get().items.filter((item) => item.id !== id) });
  },
}));
