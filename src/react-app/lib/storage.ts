// Persistence layer.
// - Project metadata (JSON) -> localStorage, small and synchronous, survives reload.
// - Media blobs -> IndexedDB, so large files never bloat the metadata store.

import type {
	AppSettings,
	Character,
	MediaItem,
	Project,
	Scene,
	ScriptData,
} from "./types";

const META_KEY = "avh.state.v1";
const SETTINGS_KEY = "avh.settings.v1";

export interface PersistedState {
	projects: Project[];
	scenes: Scene[];
	characters: Character[];
	media: MediaItem[];
	scripts: Record<string, ScriptData>;
}

export const defaultSettings: AppSettings = {
	theme: "dark",
	reduceMotion: false,
	defaultAspectRatio: "16:9",
	defaultLanguage: "English",
	exportQuality: "standard",
	allowExternalUploads: false,
	creatorName: "",
	onboarded: false,
};

export function emptyState(): PersistedState {
	return { projects: [], scenes: [], characters: [], media: [], scripts: {} };
}

export function loadState(): PersistedState {
	if (typeof localStorage === "undefined") return emptyState();
	try {
		const raw = localStorage.getItem(META_KEY);
		if (!raw) return emptyState();
		const parsed = JSON.parse(raw) as Partial<PersistedState>;
		return {
			projects: parsed.projects ?? [],
			scenes: parsed.scenes ?? [],
			characters: parsed.characters ?? [],
			media: parsed.media ?? [],
			scripts: parsed.scripts ?? {},
		};
	} catch {
		return emptyState();
	}
}

let saveTimer: number | undefined;

export function saveState(state: PersistedState) {
	if (typeof localStorage === "undefined") return;
	if (saveTimer) window.clearTimeout(saveTimer);
	saveTimer = window.setTimeout(() => {
		try {
			localStorage.setItem(META_KEY, JSON.stringify(state));
		} catch (err) {
			console.warn("[avh] could not persist state", err);
		}
	}, 250);
}

export function saveStateNow(state: PersistedState) {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(META_KEY, JSON.stringify(state));
	} catch (err) {
		console.warn("[avh] could not persist state", err);
	}
}

export function loadSettings(): AppSettings {
	if (typeof localStorage === "undefined") return defaultSettings;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return defaultSettings;
		return { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) };
	} catch {
		return defaultSettings;
	}
}

export function saveSettings(settings: AppSettings) {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch (err) {
		console.warn("[avh] could not persist settings", err);
	}
}

/* ---------------------------------- IndexedDB ---------------------------------- */

const DB_NAME = "avh-media";
const STORE = "blobs";
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve) => {
		if (typeof indexedDB === "undefined") {
			resolve(null);
			return;
		}
		try {
			const req = indexedDB.open(DB_NAME, 1);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE)) {
					db.createObjectStore(STORE, { keyPath: "id" });
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
	return dbPromise;
}

export async function putBlob(id: string, blob: Blob): Promise<boolean> {
	const db = await openDb();
	if (!db) return false;
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(STORE, "readwrite");
			tx.objectStore(STORE).put({ id, blob });
			tx.oncomplete = () => resolve(true);
			tx.onerror = () => resolve(false);
		} catch {
			resolve(false);
		}
	});
}

export async function getBlob(id: string): Promise<Blob | null> {
	const db = await openDb();
	if (!db) return null;
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(STORE, "readonly");
			const req = tx.objectStore(STORE).get(id);
			req.onsuccess = () => resolve((req.result as { blob: Blob } | undefined)?.blob ?? null);
			req.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}

export async function deleteBlob(id: string): Promise<void> {
	const db = await openDb();
	if (!db) return;
	try {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(id);
	} catch {
		/* ignore */
	}
}

export async function storageEstimate(): Promise<{ usage: number; quota: number }> {
	if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
		return { usage: 0, quota: 0 };
	}
	const est = await navigator.storage.estimate();
	return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}
