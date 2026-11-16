import type {
  LocalProject,
  ProjectSummary,
  ExportRecord,
  ExportSummary,
  Preset,
} from "./types";
let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      if (!window.indexedDB) {
        reject(
          new Error(
            "Your browser does not support local project storage. Use a recent browser with private browsing disabled.",
          ),
        );
        return;
      }
      const request = indexedDB.open("kazu-audio-studio", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("projects", { keyPath: "id" });
        db.createObjectStore("exports", { keyPath: "id" });
        db.createObjectStore("presets", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          new Error(
            "Could not open local storage. Check browser storage permissions.",
          ),
        );
      request.onblocked = () =>
        reject(new Error("Close other KAZU Studio tabs and try again."));
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  return database;
}
async function request<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const req = action(transaction.objectStore(store));
    let result: T;
    req.onsuccess = () => {
      result = req.result as T;
    };
    req.onerror = () =>
      reject(req.error || new Error("Local storage operation failed."));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () =>
      reject(
        transaction.error ||
          new Error("Could not save. Your browser storage may be full."),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ||
          new Error(
            "Storage operation was interrupted. Your project has not been deleted.",
          ),
      );
  });
}
export async function saveProject(project: LocalProject) {
  await request("projects", "readwrite", (store) => store.put(project));
}
export async function getProject(id: string) {
  return await request<LocalProject | undefined>(
    "projects",
    "readonly",
    (store) => store.get(id),
  );
}
export async function getProjects() {
  const records = await request<LocalProject[]>(
    "projects",
    "readonly",
    (store) => store.getAll(),
  );
  return records.map(({ audio, ...project }) => ({
    ...project,
    hasAudio: !!audio,
  })) as ProjectSummary[];
}
export async function deleteProject(id: string) {
  await request("projects", "readwrite", (store) => store.delete(id));
}
export async function saveExport(record: ExportRecord) {
  await request("exports", "readwrite", (store) => store.put(record));
}
export async function getExports() {
  const records = await request<ExportRecord[]>(
    "exports",
    "readonly",
    (store) => store.getAll(),
  );
  return records.map(({ blob, ...record }) => ({
    ...record,
    size: blob.size,
  })) as ExportSummary[];
}
export async function getExport(id: string) {
  return await request<ExportRecord | undefined>(
    "exports",
    "readonly",
    (store) => store.get(id),
  );
}
export async function deleteExport(id: string) {
  await request("exports", "readwrite", (store) => store.delete(id));
}
export async function saveLocalPreset(preset: Preset) {
  await request("presets", "readwrite", (store) => store.put(preset));
}
export async function getLocalPresets() {
  return await request<Preset[]>("presets", "readonly", (store) =>
    store.getAll(),
  );
}
export async function deleteLocalPreset(id: string) {
  await request("presets", "readwrite", (store) => store.delete(id));
}
export async function storageEstimate() {
  if (navigator.storage?.estimate) return await navigator.storage.estimate();
  return null;
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
