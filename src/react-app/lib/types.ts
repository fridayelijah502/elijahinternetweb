// Core domain types for AI VISION HUB.
// All project metadata is local (browser storage). Media blobs live in IndexedDB.

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "custom";

export type FilmType =
	| "history"
	| "documentary"
	| "storytelling"
	| "educational"
	| "animation"
	| "cinematic-short"
	| "advertisement"
	| "custom";

export type TargetPlatform =
	| "youtube-long"
	| "youtube-shorts"
	| "facebook"
	| "custom";

export type ProjectStatus = "draft" | "in-progress" | "exported" | "archived";

export interface ProjectSettings {
	aspectRatio: AspectRatio;
	customAspect?: string;
	platform: TargetPlatform;
	language: string;
	audience: string;
	narrationStyle: string;
	visualStyle: string;
	targetDurationSec: number;
}

export interface ActivityEntry {
	id: string;
	at: number;
	kind:
		| "project"
		| "script"
		| "scene"
		| "character"
		| "media"
		| "image"
		| "video"
		| "audio"
		| "export";
	label: string;
}

export interface Project {
	id: string;
	title: string;
	description: string;
	filmType: FilmType;
	premise: string;
	tone: string;
	genre: string;
	settings: ProjectSettings;
	status: ProjectStatus;
	createdAt: number;
	updatedAt: number;
	archived: boolean;
	thumbnailId?: string;
	sceneIds: string[];
	characterIds: string[];
	activity: ActivityEntry[];
}

export interface DialogueLine {
	id: string;
	speaker: string;
	text: string;
}

export type SceneStatus =
	| "draft"
	| "ready"
	| "image"
	| "video"
	| "audio"
	| "approved";

export interface Scene {
	id: string;
	projectId: string;
	number: number;
	title: string;
	purpose: string;
	location: string;
	timeOfDay: string;
	atmosphere: string;
	characterIds: string[];
	action: string;
	camera: string;
	imagePrompt: string;
	videoPrompt: string;
	narration: string;
	dialogue: DialogueLine[];
	durationSec: number;
	aspectRatio: AspectRatio;
	visualStyle: string;
	referenceImageIds: string[];
	voiceNotes: string;
	soundNotes: string;
	status: SceneStatus;
	statusMessage?: string;
	errorMessage?: string;
	imageMediaId?: string;
	videoMediaId?: string;
	audioMediaIds: string[];
	continuityNotes: string;
	approved: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface Character {
	id: string;
	projectId: string;
	name: string;
	ageRange: string;
	role: string;
	personality: string;
	clothing: string;
	appearance: string;
	voice: string;
	background: string;
	continuityNotes: string;
	prompt: string;
	referenceImageIds: string[];
	archived: boolean;
	createdAt: number;
	updatedAt: number;
}

export type MediaKind = "image" | "video" | "audio" | "subtitle" | "export" | "other";

export interface MediaItem {
	id: string;
	projectId?: string;
	sceneId?: string;
	kind: MediaKind;
	name: string;
	mime: string;
	size: number;
	createdAt: number;
	origin: "import" | "generated" | "exported";
	providerId?: string;
	note?: string;
}

export interface Chapter {
	id: string;
	title: string;
	sceneIds: string[];
}

export interface ScriptData {
	premise: string;
	audience: string;
	genre: string;
	tone: string;
	targetDurationSec: number;
	chapters: Chapter[];
	updatedAt: number;
}

export type ProviderId =
	| "none"
	| "openai"
	| "huggingface"
	| "ollama"
	| "stability"
	| "elevenlabs"
	| "whisper"
	| "replicate";

export interface ProviderInfo {
	id: ProviderId;
	label: string;
	kind: "text" | "image" | "video" | "speech" | "translation" | "transcription";
	configured: boolean;
	detail: string;
	capabilities: string[];
	limits?: string;
}

export interface ProvidersResponse {
	providers: ProviderInfo[];
	serverConfigured: boolean;
}

export interface AppSettings {
	theme: "dark" | "light";
	reduceMotion: boolean;
	defaultAspectRatio: AspectRatio;
	defaultLanguage: string;
	exportQuality: "standard" | "high";
	allowExternalUploads: boolean;
	creatorName: string;
	onboarded: boolean;
}
