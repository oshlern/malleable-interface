import { create } from "zustand";
import type {
  TaskDrivenDataModel,
  ViewType,
  UpdateOperation,
} from "@jelly/shared";
import { api } from "../api/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelSnapshot?: TaskDrivenDataModel;
}

export interface PanelState {
  id: string;
  entityName: string;
  title: string;
  width: number;
}

export interface HistoryEntry {
  model: TaskDrivenDataModel;
  messageId: string;
}

export interface JellyStore {
  model: TaskDrivenDataModel | null;
  messages: ChatMessage[];
  panels: PanelState[];
  history: HistoryEntry[];
  highlightedInstanceId: string | null;
  loading: boolean;
  error: string | null;
  viewOverrides: Record<string, ViewType>;

  generate: (prompt: string) => Promise<void>;
  sendFollowUp: (prompt: string) => Promise<void>;
  autocomplete: (
    entityName: string,
    instanceId: string,
    knownValues: Record<string, unknown>,
    hint?: string,
  ) => Promise<Record<string, unknown>>;

  openPanel: (entityName: string) => void;
  closePanel: (panelId: string) => void;
  reorderPanels: (fromIndex: number, toIndex: number) => void;

  setHighlight: (instanceId: string | null) => void;
  setViewType: (entityName: string, viewType: ViewType) => void;

  updateDataValue: (
    entityName: string,
    instanceId: string,
    attribute: string,
    value: unknown,
  ) => void;
  addInstance: (entityName: string, instance: Record<string, unknown>) => void;
  removeInstance: (entityName: string, instanceId: string) => void;
  deleteAttribute: (entityName: string, attributeName: string) => void;

  restoreFromHistory: (messageId: string) => void;
}

let msgCounter = 0;
function nextMsgId() {
  return `msg_${++msgCounter}_${Date.now()}`;
}

export const useStore = create<JellyStore>((set, get) => ({
  model: null,
  messages: [],
  panels: [],
  history: [],
  highlightedInstanceId: null,
  loading: false,
  error: null,
  viewOverrides: {},

  async generate(prompt: string) {
    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };

    set({ loading: true, error: null, messages: [...get().messages, userMsg] });

    try {
      const res = await api.generate({ prompt });

      const assistantMsg: ChatMessage = {
        id: nextMsgId(),
        role: "assistant",
        content: res.message,
        timestamp: Date.now(),
        modelSnapshot: res.model,
      };

      const taskEntity = res.model.schema.taskEntity;
      const homePanel: PanelState = {
        id: `panel_${taskEntity}`,
        entityName: taskEntity,
        title:
          res.model.schema.entities[taskEntity]?.name || taskEntity,
        width: 400,
      };

      set({
        model: res.model,
        messages: [...get().messages, assistantMsg],
        panels: [homePanel],
        history: [
          ...get().history,
          { model: res.model, messageId: assistantMsg.id },
        ],
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Generation failed",
        loading: false,
      });
    }
  },

  async sendFollowUp(prompt: string) {
    const { model } = get();
    if (!model) return;

    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };

    set({ loading: true, error: null, messages: [...get().messages, userMsg] });

    try {
      const res = await api.update({ prompt, currentModel: model });

      const assistantMsg: ChatMessage = {
        id: nextMsgId(),
        role: "assistant",
        content: res.message,
        timestamp: Date.now(),
        modelSnapshot: res.model,
      };

      set({
        model: res.model,
        messages: [...get().messages, assistantMsg],
        history: [
          ...get().history,
          { model: res.model, messageId: assistantMsg.id },
        ],
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Update failed",
        loading: false,
      });
    }
  },

  async autocomplete(entityName, instanceId, knownValues, hint) {
    const { model } = get();
    if (!model) throw new Error("No model loaded");

    const res = await api.autocomplete({
      entityName,
      instanceId,
      knownValues,
      currentModel: model,
      userHint: hint,
    });

    const data = { ...get().model!.data };
    const instances = [...(data[entityName] || [])];
    const idx = instances.findIndex((i) => i.id === instanceId);
    if (idx >= 0) {
      instances[idx] = { ...instances[idx], ...res.completedValues };
      data[entityName] = instances;
      set({ model: { ...get().model!, data } });
    }

    return res.completedValues;
  },

  openPanel(entityName: string) {
    const { panels, model } = get();
    if (panels.some((p) => p.entityName === entityName)) return;
    if (!model) return;

    const entity = model.schema.entities[entityName];
    set({
      panels: [
        ...panels,
        {
          id: `panel_${entityName}_${Date.now()}`,
          entityName,
          title: entity?.name || entityName,
          width: 400,
        },
      ],
    });
  },

  closePanel(panelId: string) {
    set({ panels: get().panels.filter((p) => p.id !== panelId) });
  },

  reorderPanels(fromIndex: number, toIndex: number) {
    const panels = [...get().panels];
    const [moved] = panels.splice(fromIndex, 1);
    panels.splice(toIndex, 0, moved);
    set({ panels });
  },

  setHighlight(instanceId: string | null) {
    set({ highlightedInstanceId: instanceId });
  },

  setViewType(entityName: string, viewType: ViewType) {
    set({
      viewOverrides: { ...get().viewOverrides, [entityName]: viewType },
    });
  },

  updateDataValue(entityName, instanceId, attribute, value) {
    const { model } = get();
    if (!model) return;

    const data = { ...model.data };
    const instances = [...(data[entityName] || [])];
    const idx = instances.findIndex((i) => i.id === instanceId);
    if (idx >= 0) {
      instances[idx] = { ...instances[idx], [attribute]: value };
      data[entityName] = instances;
      set({ model: { ...model, data } });
    }
  },

  addInstance(entityName, instance) {
    const { model } = get();
    if (!model) return;

    const data = { ...model.data };
    data[entityName] = [...(data[entityName] || []), instance];
    set({ model: { ...model, data } });
  },

  removeInstance(entityName, instanceId) {
    const { model } = get();
    if (!model) return;

    const data = { ...model.data };
    data[entityName] = (data[entityName] || []).filter(
      (i) => i.id !== instanceId,
    );
    set({ model: { ...model, data } });
  },

  deleteAttribute(entityName, attributeName) {
    const { model } = get();
    if (!model) return;

    const schema = { ...model.schema };
    const entities = { ...schema.entities };
    const entity = { ...entities[entityName] };
    const attributes = { ...entity.attributes };
    delete attributes[attributeName];
    entity.attributes = attributes;
    entities[entityName] = entity;
    schema.entities = entities;

    const data = { ...model.data };
    if (data[entityName]) {
      data[entityName] = data[entityName].map((inst) => {
        const copy = { ...inst };
        delete copy[attributeName];
        return copy;
      });
    }

    set({ model: { ...model, schema, data } });
  },

  restoreFromHistory(messageId: string) {
    const entry = get().history.find((h) => h.messageId === messageId);
    if (entry) {
      set({ model: entry.model });
    }
  },
}));
