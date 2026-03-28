"use client";

export type PersistedQueueItem = {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  status: "queued" | "processing" | "complete" | "error";
  message?: string;
  reviewUrl?: string;
  file: Blob;
};

const DB_NAME = "alte-upload-queue";
const STORE_NAME = "queue";
const SETTINGS_KEY = "alte-upload-settings";

type PersistedSettings = {
  subjectId: string;
  label: string;
};

function openQueueDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open upload queue database."));
  });
}

export async function loadPersistedQueue() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return [] as PersistedQueueItem[];
  }

  const database = await openQueueDatabase();

  return new Promise<PersistedQueueItem[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result as PersistedQueueItem[]).map((item) => ({
        ...item,
        status: item.status === "processing" ? "queued" : item.status,
        message:
          item.status === "processing"
            ? "Requeued after refresh."
            : item.message,
      }));

      resolve(items);
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to read upload queue."));
  });
}

export async function savePersistedQueue(items: PersistedQueueItem[]) {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return;
  }

  const database = await openQueueDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const clearRequest = store.clear();

    clearRequest.onerror = () => reject(clearRequest.error ?? new Error("Unable to clear upload queue."));
    clearRequest.onsuccess = () => {
      for (const item of items) {
        store.put(item);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save upload queue."));
  });
}

export function loadPersistedSettings() {
  if (typeof window === "undefined") {
    return null as PersistedSettings | null;
  }

  const rawValue = window.localStorage.getItem(SETTINGS_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PersistedSettings;
  } catch {
    return null;
  }
}

export function savePersistedSettings(settings: PersistedSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
