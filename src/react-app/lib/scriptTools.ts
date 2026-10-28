// Script and prompt tools that work entirely offline (no AI required).
// These are deterministic helpers, never presented as AI-generated content.

import type { DialogueLine, Scene } from "./types";

export const FILM_TYPES = [
	{ id: "history", label: "History" },
	{ id: "documentary", label: "Documentary" },
	{ id: "storytelling", label: "Storytelling" },
	{ id: "educational", label: "Educational" },
	{ id: "animation", label: "Animation" },
	{ id: "cinematic-short", label: "Cinematic short" },
	{ id: "advertisement", label: "Advertisement" },
	{ id: "custom", label: "Custom" },
] as const;

export const PLATFORMS = [
	{ id: "youtube-long", label: "YouTube long-form", hint: "16:9, 8-20 minutes" },
	{ id: "youtube-shorts", label: "YouTube Shorts", hint: "9:16, up to 60 seconds" },
	{ id: "facebook", label: "Facebook", hint: "9:16 or 1:1, feed or Reels" },
	{ id: "custom", label: "Custom", hint: "Pick your own format" },
] as const;

export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5"] as const;

export const LANGUAGES = [
	"English",
	"Arabic",
	"Spanish",
	"French",
	"Portuguese",
	"Hindi",
	"Urdu",
	"Chinese (Mandarin)",
	"Japanese",
	"Swahili",
	"Russian",
] as const;

export const NARRATION_STYLES = [
	"Documentary narrator",
	"Warm storyteller",
	"Authoritative teacher",
	"Dramatic and cinematic",
	"Light and friendly",
	"Documented, measured",
] as const;

export const VISUAL_STYLES = [
	"Cinematic realism",
	"Documentary realism",
	"Historical epic",
	"Stylised animation",
	"Hand-painted illustration",
	"Clean educational animation",
	"Dark moody fantasy",
	"Bright commercial",
] as const;

export const IMAGE_PROMPT_PRESETS: { id: string; label: string; prompt: string }[] = [
	{
		id: "egypt",
		label: "Historical Egypt",
		prompt:
			"Ancient Egyptian setting, authentic period architecture, warm sandstone light, dust in the air, cinematic 35mm, highly detailed, historically grounded",
	},
	{
		id: "doc",
		label: "Documentary realism",
		prompt:
			"Documentary photograph, natural available light, candid composition, subtle grain, realistic skin tones, handheld reportage feel",
	},
	{
		id: "cinematic",
		label: "Cinematic lighting",
		prompt:
			"Cinematic film still, volumetric lighting, shallow depth of field, anamorphic highlights, teal and violet grade, 2.39:1 framing",
	},
	{
		id: "fantasy",
		label: "Fantasy",
		prompt:
			"Epic fantasy environment, painterly concept art, dramatic god rays, rich saturated colour, detailed worldbuilding, artstation quality",
	},
	{
		id: "edu",
		label: "Educational animation",
		prompt:
			"Clean flat educational animation frame, friendly shapes, bright accessible palette, clear focal subject, simple background, vector style",
	},
	{
		id: "noir",
		label: "Neon noir",
		prompt:
			"Neon noir night scene, wet reflective asphalt, magenta and cyan signage, hard rim light, smoky atmosphere, 35mm anamorphic",
	},
];

export const NEGATIVE_PRESETS = [
	"blurry, low resolution, deformed hands, extra fingers, text artifacts, watermark",
	"cartoon, illustration, painting, unrealistic proportions, oversaturated",
	"modern clothing, modern vehicles, power lines, smartphone screens, anachronism",
];

export interface OutlineTemplate {
	id: string;
	label: string;
	build: (title: string, premise: string, audience: string, durationSec: number) => {
		chapters: { title: string; beats: string[] }[];
	};
}

export const OUTLINE_TEMPLATES: OutlineTemplate[] = [
	{
		id: "classic",
		label: "Classic three-act",
		build: (title, premise, audience, durationSec) => {
			const beat = Math.max(8, Math.round(durationSec / 6));
			return {
				chapters: [
					{
						title: "Opening hook",
						beats: [
							`Open on a striking image that states the theme of "${title}".`,
							`Establish the world for ${audience || "a general audience"}.`,
							`Pose the central question.`,
						],
					},
					{
						title: "Setup",
						beats: [
							`Introduce the main character and what they want.`,
							`Show the setting and the stakes.`,
							`First obstacle appears.`,
						],
					},
					{
						title: "Rising action",
						beats: [
							`Complication forces the character to act.`,
							`Midpoint: the situation changes for the worse.`,
							`Allies and conflicts sharpen.`,
						],
					},
					{
						title: "Climax",
						beats: [
							`The character confronts the core problem.`,
							`Highest visual moment of the film.`,
							`The decisive choice.`,
						],
					},
					{
						title: "Resolution",
						beats: [
							`Consequence of the choice.`,
							`Close the loop opened at the start.`,
							`Final line to camera or final image.`,
						],
					},
				].map((c) => ({ ...c, beats: c.beats.map((b) => `${b} (~${beat}s)`) }));
			};
		},
	},
	{
		id: "documentary",
		label: "Documentary chapters",
		build: (title, premise) => ({
			chapters: [
				{
					title: "Cold open",
					beats: ["A single striking fact or moment.", "Set the tone without narration overload."],
				},
				{
					title: "Context",
					beats: [`Where and when "${title}" takes place.`, `Why this subject matters now.`],
				},
				{
					title: "Evidence",
					beats: ["Archival or recreated visuals.", "Interviews, records, and artefacts."],
				},
				{
					title: "Turning point",
					beats: ["The discovery or event that changed everything.", "Consequences."],
				},
				{
					title: "Close",
					beats: [`Return to the opening image.`, premise || "Summarise the human meaning."],
			],
		}),
	},
	{
		id: "short",
		label: "Vertical short",
		build: (title, premise) => ({
			chapters: [
				{ title: "Hook (0-3s)", beats: ["One bold statement on screen.", "No slow build."] },
				{ title: "Context (3-12s)", beats: ["Deliver the core fact fast.", premise || "Set up the payoff."] },
				{ title: "Payoff (12-25s)", beats: ["Reveal or twist.", "Land the line."] },
				{ title: "End card", beats: ["Title, channel, call to action."] },
			],
		}),
	},
];

export interface ParsedScene {
	title: string;
	narration: string;
	action: string;
	dialogue: DialogueLine[];
}

/**
 * Offline script -> scene splitter.
 * Recognises "SCENE 1", "INT.", "EXT." and blank-line separated blocks.
 */
export function splitScriptIntoScenes(raw: string): ParsedScene[] {
	const text = raw.replace(/\r\n/g, "\n").trim();
	if (!text) return [];
	const blocks = text
		.split(/\n\s*\n/)
		.map((b) => b.trim())
		.filter(Boolean);

	const chunks: ParsedScene[] = [];
	for (const block of blocks) {
		const lines = block.split("\n");
		const heading = lines[0].trim();
		const isHeading = /^(scene\s*\d+[\s:.-]*|int\.?\b|ext\.?\b|i\/e\b)/i.test(heading);
		if (isHeading || chunks.length === 0) {
			const title = isHeading
				? heading.replace(/^scene\s*\d+[\s:.-]*/i, "").trim() || heading
				: `Scene ${chunks.length + 1}`;
			chunks.push({ title, narration: "", action: "", dialogue: [] });
		}
		const current = chunks[chunks.length - 1];
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			const speakerMatch = trimmed.match(/^([A-Z][A-Za-z0-9 .'\-]{1,30}):\s*(.+)$/);
			if (speakerMatch) {
				current.dialogue.push({
					id: `dlg_${Math.random().toString(36).slice(2, 9)}`,
					speaker: speakerMatch[1].trim(),
					text: speakerMatch[2].trim(),
				});
			} else if (current.narration === "" && current.action === "" && !isHeading) {
				current.narration = trimmed;
			} else if (current.action === "") {
				current.action = current.action ? `${current.action} ${trimmed}` : trimmed;
			} else {
				current.narration = current.narration
					? `${current.narration} ${trimmed}`
					: trimmed;
			}
		}
	}
	return chunks;
}

/** Rough narration reading speed used for duration estimates (words per minute). */
export const WORDS_PER_MINUTE = 140;

/* --------------------------- Script tool helpers --------------------------- */

/**
 * Estimated screen time for a scene: the longer of the spoken narration estimate
 * and the director's own target duration. Never claims to be exact.
 */
export function estimateSceneDuration(scene: {
	narration?: string;
	dialogue?: DialogueLine[];
	durationSec?: number;
}): number {
	const spoken = [scene.narration ?? "", ...(scene.dialogue ?? []).map((d) => d.text)]
		.filter(Boolean)
		.join(" ");
	const spokenSec = spoken.trim() ? estimateDurationSec(spoken) : 0;
	const target = scene.durationSec ?? 0;
	return Math.max(1, Math.round(Math.max(spokenSec, target)));
}

/** Parse free-form script text into scene-shaped records. Offline and deterministic. */
export function parseScriptText(text: string): {
	scenes: (Pick<Scene, "title" | "purpose" | "narration" | "action" | "dialogue"> & {
		dialogue: DialogueLine[];
	})[];
} {
	const chunks = splitScriptIntoScenes(text);
	return {
		scenes: chunks.map((c, i) => ({
			title: c.title || `Scene ${i + 1}`,
			purpose: c.action ? c.action.slice(0, 120) : "",
			narration: c.narration,
			action: c.action,
			dialogue: c.dialogue,
		})),
	};
}

export interface ScriptTextDraft {
	premise?: string;
	audience?: string;
	genre?: string;
	tone?: string;
	targetDurationSec?: number;
}

/** Render a project script (details + scenes) as plain text for export. */
export function scriptToText(draft: ScriptTextDraft, scenes: Scene[]): string {
	const lines: string[] = [];
	lines.push("TITLE");
	lines.push("");
	lines.push("PREMISE");
	lines.push(draft.premise || "(not set)");
	lines.push("");
	if (draft.genre || draft.tone || draft.audience) {
		lines.push("DETAILS");
		if (draft.genre) lines.push(`Genre: ${draft.genre}`);
		if (draft.tone) lines.push(`Tone: ${draft.tone}`);
		if (draft.audience) lines.push(`Audience: ${draft.audience}`);
		if (draft.targetDurationSec)
			lines.push(`Target duration: ${formatDuration(draft.targetDurationSec)} (target only)`);
		lines.push("");
	}
	lines.push("SCENES");
	lines.push("");
	scenes.forEach((scene, i) => {
		lines.push(`SCENE ${i + 1} — ${scene.title || "Untitled scene"}`);
		if (scene.location) lines.push(`Location: ${scene.location}`);
		if (scene.timeOfDay) lines.push(`Time: ${scene.timeOfDay}`);
		if (scene.action) lines.push(`Action: ${scene.action}`);
		if (scene.narration) lines.push(`Narration: ${scene.narration}`);
		for (const line of scene.dialogue ?? []) {
			lines.push(`${line.speaker}: ${line.text}`);
		}
		lines.push(`[Estimated duration: ${formatDuration(estimateSceneDuration(scene))}]`);
		lines.push("");
	});
	return lines.join("\n");
}

export interface OutlineInput {
	title: string;
	premise?: string;
	audience?: string;
	durationSec: number;
	filmType?: string;
}

/**
 * Build a structural outline from a local template. Deterministic and offline —
 * this is NOT AI output and is labelled as a template wherever it is used.
 */
export function buildOutline(input: OutlineInput): {
	chapters: { title: string; beats: string[] }[];
	template: string;
} {
	const templateId =
		input.filmType === "documentary" || input.filmType === "history"
			? "documentary"
			: input.durationSec <= 90
				? "short"
				: "classic";
	const template = OUTLINE_TEMPLATES.find((t) => t.id === templateId) ?? OUTLINE_TEMPLATES[0];
	const chapters = template.build(
		input.title,
		input.premise ?? "",
		input.audience ?? "",
		input.durationSec,
	).chapters;
	return { chapters, template: template.label };
}

export function estimateDurationSec(text: string): number {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round((words / WORDS_PER_MINUTE) * 60));
}

export function totalDurationSec(scenes: Scene[]): number {
	return scenes.reduce((sum, s) => sum + (s.durationSec || 0), 0);
}

export function formatDuration(sec: number): string {
	const s = Math.max(0, Math.round(sec));
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
	return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function timeAgo(ts: number): string {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(ts).toLocaleDateString();
}

export function toSrt(scenes: Scene[]): string {
	const cues: { start: number; end: number; text: string }[] = [];
	let cursor = 0;
	for (const scene of scenes) {
		const duration = Math.max(1, scene.durationSec);
		const blocks: string[] = [];
		if (scene.narration.trim()) blocks.push(scene.narration.trim());
		for (const line of scene.dialogue) {
			blocks.push(`${line.speaker}: ${line.text}`);
		}
		if (blocks.length) {
			cues.push({ start: cursor, end: cursor + duration, text: blocks.join("\n") });
		}
		cursor += duration;
	}
	const stamp = (total: number) => {
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = Math.floor(total % 60);
		const ms = Math.round((total - Math.floor(total)) * 1000);
		return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
	};
	return cues
		.map((cue, i) => `${i + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`)
		.join("\n");
}

export function buildCharacterPrompt(character: {
	name: string;
	ageRange: string;
	appearance: string;
	clothing: string;
	personality: string;
}): string {
	return [
		character.name,
		character.ageRange ? `approx. ${character.ageRange} years old` : "",
		character.appearance,
		character.clothing ? `wearing ${character.clothing}` : "",
		character.personality ? `demeanour: ${character.personality}` : "",
		"consistent character design across all shots, same face, same wardrobe, same hairstyle",
	]
		.filter(Boolean)
		.join(", ");
}

export function buildSceneImagePrompt(
	scene: Pick<Scene, "imagePrompt" | "location" | "timeOfDay" | "atmosphere" | "visualStyle">,
	characterPrompts: string[] = [],
): string {
	const extras = [
		scene.location ? `location: ${scene.location}` : "",
		scene.timeOfDay ? `time of day: ${scene.timeOfDay}` : "",
		scene.atmosphere ? `atmosphere: ${scene.atmosphere}` : "",
		scene.visualStyle ? `style: ${scene.visualStyle}` : "",
		characterPrompts.length ? `characters: ${characterPrompts.join("; ")}` : "",
	]
		.filter(Boolean)
		.join(", ");
	return `${scene.imagePrompt}${extras ? `, ${extras}` : ""}`;
}

export function buildSceneVideoPrompt(
	scene: Pick<Scene, "videoPrompt" | "camera" | "action">,
	characterPrompts: string[] = [],
): string {
	const extras = [
		scene.camera ? `camera: ${scene.camera}` : "",
		scene.action ? `action: ${scene.action}` : "",
		characterPrompts.length ? `characters: ${characterPrompts.join("; ")}` : "",
	]
		.filter(Boolean)
		.join(", ");
	return `${scene.videoPrompt || scene.imagePrompt}${extras ? `, ${extras}` : ""}`;
}

/** Local phrasebook fallback — deliberately small and labelled as a glossary, not full translation. */
export const PHRASEBOOK: Record<string, Record<string, string>> = {
	"Arabic": {
		Hello: "مرحبا",
		"Good morning": "صباح الخير",
		"Goodbye: "Goodbye",
		Thank: "شكرا",
		"Yes: "نعم",
	},
	"French": {
		Hello: "Bonjour",
		"Good morning": "Bonjour",
		"Goodbye": "Au revoir",
		"Thank you": "Merci",
		Yes: "Oui",
	},
	"Spanish": {
		Hello: "Hola",
		"Good morning": "Buenos días",
		"Goodbye": "Adiós",
		"Thank you": "Gracias",
		Yes: "Sí",
	},
};

export function phrasebookLookup(text: string, language: string): string | null {
	const book = PHRASEBOOK[language];
	if (!book) return null;
	const trimmed = text.trim();
	if (book[trimmed]) return book[trimmed];
	const lower = trimmed.toLowerCase();
	for (const [key, value] of Object.entries(book)) {
		if (key.toLowerCase() === lower) return value;
	}
	return null;
}
