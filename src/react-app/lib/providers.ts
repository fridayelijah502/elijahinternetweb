// Client-side adapter for the server-side AI proxy.
//
// Design rules enforced here:
//  - API keys never live in this file. They live in Worker environment variables.
//  - If nothing is configured, the adapter returns a "setup required" result and the
//    UI shows honest setup instructions instead of pretending to generate.
//  - The user must explicitly allow external uploads before scripts/images/audio are sent.

import type { ProviderInfo, ProvidersResponse } from "./types";

const BASE = "/api";

export class ProviderError extends Error {
	constructor(
		message: string,
		readonly setupRequired = false,
	) {
		super(message);
		this.name = "ProviderError";
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	let res: Response;
	try {
		res = await fetch(`${BASE}${path}`, {
			...init,
			headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
		});
	} catch {
		throw new ProviderError(
			"Could not reach the AI service. Check your connection, or run the app locally with `npm run dev`.",
		);
	}
	const text = await res.text();
	let body: unknown = null;
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = { error: text };
	}
	if (!res.ok) {
		const payload = body as { error?: string; setupRequired?: boolean } | null;
		throw new ProviderError(
			payload?.error ?? `Request failed (${res.status})`,
			payload?.setupRequired ?? false,
		);
	}
	return body as T;
}

export async function fetchProviders(): Promise<ProvidersResponse> {
	return request<ProvidersResponse>("/providers");
}

export interface TextRequest {
	prompt: string;
	system?: string;
	temperature?: number;
	maxTokens?: number;
}

export interface TextResponse {
	text: string;
	provider: string;
}

export async function generateText(req: TextRequest): Promise<TextResponse> {
	return request<TextResponse>("/ai/text", {
		method: "POST",
		body: JSON.stringify(req),
	});
}

export interface ImageRequest {
	prompt: string;
	negativePrompt?: string;
	aspectRatio?: string;
	style?: string;
	referenceImageBase64?: string;
}

export interface ImageResponse {
	imageBase64: string;
	mime: string;
	provider: string;
	note?: string;
}

export async function generateImage(req: ImageRequest): Promise<ImageResponse> {
	return request<ImageResponse>("/ai/image", {
		method: "POST",
		body: JSON.stringify(req),
	});
}

export interface VideoRequest {
	prompt: string;
	negativePrompt?: string;
	aspectRatio?: string;
	durationSec?: number;
	startImageBase64?: string;
	referenceVideoBase64?: string;
}

export interface VideoResponse {
	videoBase64: string;
	mime: string;
	provider: string;
	note?: string;
}

export async function generateVideo(req: VideoRequest): Promise<VideoResponse> {
	return request<VideoResponse>("/ai/video", {
		method: "POST",
		body: JSON.stringify(req),
	});
}

export interface SpeechRequest {
	text: string;
	voice?: string;
	speed?: number;
	language?: string;
}

export interface SpeechResponse {
	audioBase64: string;
	mime: string;
	provider: string;
}

export async function generateSpeech(req: SpeechRequest): Promise<SpeechResponse> {
	return request<SpeechResponse>("/ai/speech", {
		method: "POST",
		body: JSON.stringify(req),
	});
}

export interface TranslateRequest {
	text: string;
	sourceLanguage: string;
	targetLanguage: string;
}

export interface TranslateResponse {
	translation: string;
	provider: string;
	note?: string;
}

export async function translateText(req: TranslateRequest): Promise<TranslateResponse> {
	return request<TranslateResponse>("/ai/translate", {
		method: "POST",
		body: JSON.stringify(req),
	});
}

export interface TranscribeRequest {
	audioBase64: string;
	language?: string;
}

export interface TranscribeResponse {
	text: string;
	provider: string;
}

export async function transcribeAudio(req: TranscribeRequest): Promise<TranscribeResponse> {
	return request<TranscribeResponse>("/ai/transcribe", {
		method: "POST",
		body: JSON.stringify(req),
	});
}

export function base64ToBlob(base64: string, mime: string): Blob {
	const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
	const binary = atob(clean);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type: mime });
}

export function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = String(reader.result ?? "");
			resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
		};
		reader.onerror = () => reject(new Error("Could not read file"));
		reader.readAsDataURL(blob);
	});
}

export function findProvider(
	providers: ProviderInfo[],
	kind: ProviderInfo["kind"],
): ProviderInfo | undefined {
	return providers.find((p) => p.kind === kind && p.configured);
}
