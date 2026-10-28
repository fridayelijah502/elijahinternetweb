// Media helpers: store blobs in IndexedDB, create object URLs, download files.

import { deleteBlob, getBlob, putBlob } from "./storage";
import type { MediaItem, MediaKind } from "./types";
import { uid } from "./store";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB per file, honest browser-friendly limit

export const ACCEPTED: Record<MediaKind, string> = {
	image: "image/*",
	video: "video/*",
	audio: "audio/*",
	subtitle: ".srt,.vtt,.txt",
	export: "*/*",
	other: "*/*",
};

export function kindFromMime(mime: string, name = ""): MediaKind {
	const lower = name.toLowerCase();
	if (mime.startsWith("image/")) return "image";
	if (mime.startsWith("video/")) return "video";
	if (mime.startsWith("audio/")) return "audio";
	if (lower.endsWith(".srt") || lower.endsWith(".vtt")) return "subtitle";
	return "other";
}

export async function saveBlob(item: MediaItem, blob: Blob): Promise<boolean> {
	return putBlob(item.id, blob);
}

export async function loadBlob(id: string): Promise<Blob | null> {
	return getBlob(id);
}

export async function removeBlob(id: string): Promise<void> {
	return deleteBlob(id);
}

/** Cache of object URLs so we do not leak them on re-render. */
const urlCache = new Map<string, string>();

export async function objectUrl(id: string): Promise<string | null> {
	const cached = urlCache.get(id);
	if (cached) return cached;
	const blob = await getBlob(id);
	if (!blob) return null;
	const url = URL.createObjectURL(blob);
	urlCache.set(id, url);
	return url;
}

export function revokeObjectUrl(id: string) {
	const url = urlCache.get(id);
	if (url) {
		URL.revokeObjectURL(url);
		urlCache.delete(id);
	}
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, mime = "text/plain") {
	downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

export function makeMediaItem(input: {
	kind: MediaKind;
	name: string;
	mime: string;
	size: number;
	origin: MediaItem["origin"];
	projectId?: string;
	sceneId?: string;
	providerId?: string;
	note?: string;
}): MediaItem {
	return {
		id: uid("med"),
		kind: input.kind,
		name: input.name,
		mime: input.mime,
		size: input.size,
		origin: input.origin,
		projectId: input.projectId,
		sceneId: input.sceneId,
		providerId: input.providerId,
		note: input.note,
		createdAt: Date.now(),
	};
}

/** Read a File as text (used for SRT / TXT / JSON imports). */
export function readAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = () => reject(new Error("Could not read file"));
		reader.readAsText(file);
	});
}
