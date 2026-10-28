import { Hono } from "hono";

/**
 * AI VISION HUB - server-side AI proxy.
 *
 * All provider credentials are read from Worker environment variables (secrets).
 * Nothing sensitive is ever returned to the client, and nothing is written into
 * the built client bundle. Every endpoint returns an honest error when the
 * matching provider is not configured.
 *
 * Optional environment variables (set with `wrangler secret put <NAME>`):
 *   OPENAI_API_KEY        -> text (gpt-4o-mini), image (gpt-image-1), speech (gpt-4o-mini-tts)
 *   REPLICATE_API_TOKEN   -> video (and text-to-video models)
 *   HUGGINGFACE_TOKEN     -> text (chat completions), image (FLUX schnell), whisper
 *   ELEVENLABS_API_KEY    -> speech
 *   OLLAMA_BASE_URL       -> local text/image models (e.g. http://localhost:11434)
 *   OLLAMA_TEXT_MODEL     -> default "llama3.2"
 *   OLLAMA_IMAGE_MODEL    -> default "sdxl"
 */

interface Env {
	OPENAI_API_KEY?: string;
	REPLICATE_API_TOKEN?: string;
	HUGGINGFACE_TOKEN?: string;
	ELEVENLABS_API_KEY?: string;
	OLLAMA_BASE_URL?: string;
	OLLAMA_TEXT_MODEL?: string;
	OLLAMA_IMAGE_MODEL?: string;
}

const app = new Hono<{ Bindings: Env }>();

const MAX_BODY_BYTES = 24 * 1024 * 1024;

function jsonError(c: any, message: string, status = 400, setupRequired = false) {
	return c.json({ error: message, setupRequired }, status);
}

async function readJson(c: any): Promise<any> {
	const text = await c.req.text();
	if (!text) return {};
	if (text.length > MAX_BODY_BYTES) throw new Error("payload too large");
	return JSON.parse(text);
}

function aspectToSize(aspect?: string): { width: number; height: number } {
	switch (aspect) {
		case "9:16":
			return { width: 720, height: 1280 };
		case "1:1":
			return { width: 1024, height: 1024 };
		case "4:5":
			return { width: 896, height: 1120 };
		case "16:9":
		default:
			return { width: 1280, height: 720 };
	}
}

app.get("/api/", (c) =>
	c.json({
		name: "AI VISION HUB",
		status: "ok",
		note: "AI proxy ready. Configure provider secrets to enable generation.",
	}),
);

app.get("/api/providers", (c) => {
	const env = c.env as Env;
	const providers = [
		{
			id: "openai",
			label: "OpenAI (gpt-4o-mini / gpt-image-1 / tts)",
			kind: "text",
			configured: Boolean(env.OPENAI_API_KEY),
			detail: env.OPENAI_API_KEY
				? "Text, image and speech generation enabled."
				: "Set OPENAI_API_KEY to enable.",
			capabilities: ["text", "image", "speech"],
			limits: "Usage is billed per request by OpenAI. Free trial credits are not guaranteed.",
		},
		{
			id: "huggingface",
			label: "Hugging Face Inference (FLUX schnell / Whisper)",
			kind: "image",
			configured: Boolean(env.HUGGINGFACE_TOKEN),
			detail: env.HUGGINGFACE_TOKEN
				? "Free-tier image generation and transcription enabled."
				: "Set HUGGINGFACE_TOKEN to enable free-tier image + transcription.",
			capabilities: ["image", "transcription"],
			limits: "Free tier has a limited request quota and can be rate limited.",
		},
		{
			id: "ollama",
			label: "Ollama (local models)",
			kind: "text",
			configured: Boolean(env.OLLAMA_BASE_URL),
			detail: env.OLLAMA_BASE_URL
				? `Using local models at ${env.OLLAMA_BASE_URL}`
				: "Set OLLAMA_BASE_URL to use local open-source models.",
			capabilities: ["text", "image"],
			limits: "Requires a capable local computer. No usage cost, but slow on low-end hardware.",
		},
		{
			id: "replicate",
			label: "Replicate (video models)",
			kind: "video",
			configured: Boolean(env.REPLICATE_API_TOKEN),
			detail: env.REPLICATE_API_TOKEN
				? "Text-to-video and image-to-video enabled."
				: "Set REPLICATE_API_TOKEN to enable video generation.",
			capabilities: ["video"],
			limits: "Video generation is billed per second of output by the model owner.",
		},
		{
			id: "elevenlabs",
			label: "ElevenLabs (voice)",
			kind: "speech",
			configured: Boolean(env.ELEVENLABS_API_KEY),
			detail: env.ELEVENLABS_API_KEY
				? "Narration and dialogue synthesis enabled."
				: "Set ELEVENLABS_API_KEY to enable AI voices.",
			capabilities: ["speech"],
			limits: "Free tier includes a limited character quota per month.",
		},
	];
	return c.json({
		providers,
		serverConfigured: providers.some((p) => p.configured),
	});
});

/* --------------------------------- Text ---------------------------------- */

app.post("/api/ai/text", async (c) => {
	const body = await readJson(c);
	const prompt = String(body.prompt ?? "").trim();
	if (!prompt) return jsonError(c, "Prompt is required.");

	const env = c.env as Env;

	if (env.OPENAI_API_KEY) {
		const res = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages: [
					...(body.system
						? [{ role: "system", content: String(body.system) }]
						: []),
					{ role: "user", content: prompt },
				],
				temperature: body.temperature ?? 0.7,
				max_tokens: body.maxTokens ?? 1200,
			}),
		});
		if (!res.ok) {
			const err = await res.text();
			return jsonError(c, `Text provider error: ${err.slice(0, 300)}`, 502);
		}
		const data = (await res.json()) as any;
		return c.json({
			text: data.choices?.[0]?.message?.content ?? "",
			provider: "openai",
		});
	}

	if (env.OLLAMA_BASE_URL) {
		const model = env.OLLAMA_TEXT_MODEL ?? "llama3.2";
		const res = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				prompt: body.system ? `${body.system}\n\n${prompt}` : prompt,
				stream: false,
				options: { temperature: body.temperature ?? 0.7 },
			}),
		});
		if (!res.ok) return jsonError(c, `Ollama error: ${(await res.text()).slice(0, 300)}`, 502);
		const data = (await res.json()) as any;
		return c.json({ text: data.response ?? "", provider: "ollama" });
	}

	if (env.HUGGINGFACE_TOKEN) {
		const res = await fetch(
			"https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.HUGGINGFACE_TOKEN}`,
				},
				body: JSON.stringify({
					model: "HuggingFaceH4/zephyr-7b-beta",
					messages: [{ role: "user", content: prompt }],
					max_tokens: body.maxTokens ?? 800,
				}),
			},
		);
		if (!res.ok) {
			return jsonError(c, `Hugging Face error: ${(await res.text()).slice(0, 300)}`, 502);
		}
		const data = (await res.json()) as any;
		return c.json({
			text: data.choices?.[0]?.message?.content ?? "",
			provider: "huggingface",
		});
	}

	return jsonError(
		c,
		"No language model configured. Set OPENAI_API_KEY, OLLAMA_BASE_URL or HUGGINGFACE_TOKEN as a Worker secret.",
		503,
		true,
	);
});

/* --------------------------------- Image --------------------------------- */

app.post("/api/ai/image", async (c) => {
	const body = await readJson(c);
	const prompt = String(body.prompt ?? "").trim();
	if (!prompt) return jsonError(c, "Image prompt is required.");
	const env = c.env as Env;
	const size = aspectToSize(body.aspectRatio);
	const fullPrompt = body.negativePrompt
		? `${prompt}\n\nAvoid: ${body.negativePrompt}`
		: prompt;

	if (env.OPENAI_API_KEY) {
		const res = await fetch("https://api.openai.com/v1/images/generations", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: "gpt-image-1",
				prompt: fullPrompt,
				size:
					body.aspectRatio === "1:1"
						? "1024x1024"
						: body.aspectRatio === "9:16"
							? "1024x1536"
							: "1536x1024",
				n: 1,
			}),
		});
		if (!res.ok) {
			return jsonError(c, `Image provider error: ${(await res.text()).slice(0, 300)}`, 502);
		}
		const data = (await res.json()) as any;
		const b64 = data.data?.[0]?.b64_json;
		if (!b64) return jsonError(c, "Image provider returned no image data.", 502);
		return c.json({ imageBase64: b64, mime: "image/png", provider: "openai" });
	}

	if (env.HUGGINGFACE_TOKEN) {
		const res = await fetch(
			"https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.HUGGINGFACE_TOKEN}`,
				},
				body: JSON.stringify({
					inputs: fullPrompt,
					parameters: { width: size.width, height: size.height, num_inference_steps: 4 },
				}),
			},
		);
		if (!res.ok) {
			return jsonError(c, `Hugging Face image error: ${(await res.text()).slice(0, 300)}`, 502);
		}
		const buf = new Uint8Array(await res.arrayBuffer());
		let binary = "";
		for (let i = 0; i < buf.length; i += 1) binary += String.fromCharCode(buf[i]);
		return c.json({
			imageBase64: btoa(binary),
			mime: "image/jpeg",
			provider: "huggingface",
			note: "FLUX schnell free tier. Availability and quota vary.",
		});
	}

	return jsonError(
		c,
		"No image engine configured. Set HUGGINGFACE_TOKEN (free tier) or OPENAI_API_KEY to enable image generation.",
		503,
		true,
	);
});

/* --------------------------------- Video --------------------------------- */

app.post("/api/ai/video", async (c) => {
	const body = await readJson(c);
	const prompt = String(body.prompt ?? "").trim();
	if (!prompt) return jsonError(c, "Video prompt is required.");
	const env = c.env as Env;

	if (!env.REPLICATE_API_TOKEN) {
		return jsonError(
			c,
			"No video engine configured. Set REPLICATE_API_TOKEN to enable text-to-video generation.",
			503,
			true,
		);
	}

	// Uses the official Replicate predictions API with a widely available
	// text-to-video model. Output length is limited by the model itself.
	const createRes = await fetch("https://api.replicate.com/v1/models/minimax/video-01/predictions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
			Prefer: "wait",
		},
		body: JSON.stringify({
			input: {
				prompt,
				first_frame_image: body.startImageBase64
					? `data:image/png;base64,${body.startImageBase64}`
					: undefined,
				duration: Math.min(Number(body.durationSec ?? 6), 6),
				aspect_ratio: body.aspectRatio ?? "16:9",
			},
		}),
	});
	const created = (await createRes.json()) as any;
	if (!createRes.ok) {
		return jsonError(c, `Video provider error: ${JSON.stringify(created).slice(0, 300)}`, 502);
	}
	const output = created.output;
	const url = Array.isArray(output) ? output[0] : output;
	if (!url) {
		return jsonError(
			c,
			`Video provider did not return a file (status: ${created.status}). Try again later.`,
			502,
		);
	}
	const fileRes = await fetch(url);
	const buf = new Uint8Array(await fileRes.arrayBuffer());
	let binary = "";
	for (let i = 0; i < buf.length; i += 1) binary += String.fromCharCode(buf[i]);
	return c.json({
		videoBase64: btoa(binary),
		mime: "video/mp4",
		provider: "replicate",
		note: "Video engines are billed per second of output and support short clips only.",
	});
});

/* --------------------------------- Speech -------------------------------- */

app.post("/api/ai/speech", async (c) => {
	const body = await readJson(c);
	const text = String(body.text ?? "").trim();
	if (!text) return jsonError(c, "Text to speak is required.");
	const env = c.env as Env;

	if (env.OPENAI_API_KEY) {
		const res = await fetch("https://api.openai.com/v1/audio/speech", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: "gpt-4o-mini-tts",
				voice: body.voice ?? "alloy",
				input: text,
				speed: body.speed ?? 1,
			}),
		});
		if (!res.ok) {
			return jsonError(c, `Speech provider error: ${(await res.text()).slice(0, 300)}`, 502);
		}
		const buf = new Uint8Array(await res.arrayBuffer());
		let binary = "";
		for (let i = 0; i < buf.length; i += 1) binary += String.fromCharCode(buf[i]);
		return c.json({ audioBase64: btoa(binary), mime: "audio/mpeg", provider: "openai" });
	}

	if (env.ELEVENLABS_API_KEY) {
		const voiceId = body.voice ?? "21m00Tcm4TlvDq8ikWAM";
		const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "audio/mpeg",
				"xi-api-key": env.ELEVENLABS_API_KEY,
			},
			body: JSON.stringify({
				text,
				model_id: "eleven_multilingual_v2",
				voice_settings: { stability: 0.5, similarity_boost: 0.75 },
			}),
		});
		if (!res.ok) {
			return jsonError(c, `Voice provider error: ${(await res.text()).slice(0, 300)}`, 502);
		}
		const buf = new Uint8Array(await res.arrayBuffer());
		let binary = "";
		for (let i = 0; i < buf.length; i += 1) binary += String.fromCharCode(buf[i]);
		return c.json({ audioBase64: btoa(binary), mime: "audio/mpeg", provider: "elevenlabs" });
	}

	return jsonError(
		c,
		"No speech engine configured. Set OPENAI_API_KEY or ELEVENLABS_API_KEY to enable AI narration, or import your own recording.",
		503,
		true,
	);
});

/* ------------------------------- Translation ------------------------------ */

app.post("/api/ai/translate", async (c) => {
	const body = await readJson(c);
	const text = String(body.text ?? "").trim();
	const target = String(body.targetLanguage ?? "").trim();
	if (!text) return jsonError(c, "Text to translate is required.");
	if (!target) return jsonError(c, "Target language is required.");
	const env = c.env as Env;

	if (env.OPENAI_API_KEY) {
		const res = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages: [
					{
						role: "system",
						content: `Translate the user's text into ${target}. Keep any SPEAKER: labels exactly as they are and keep line structure. Return only the translation.`,
					},
					{ role: "user", content: text },
				],
				temperature: 0.2,
			}),
		});
		if (!res.ok) {
			return jsonError(c, `Translation provider error: ${(await res.text()).slice(0, 300)}`, 502);
		}
		const data = (await res.json()) as any;
		return c.json({
			translation: data.choices?.[0]?.message?.content ?? "",
			provider: "openai",
		});
	}

	if (env.OLLAMA_BASE_URL) {
		const model = env.OLLAMA_TEXT_MODEL ?? "llama3.2";
		const res = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				prompt: `Translate to ${target}. Keep SPEAKER labels. Return only the translation.\n\n${text}`,
				stream: false,
			}),
		});
		if (!res.ok) return jsonError(c, `Ollama error: ${(await res.text()).slice(0, 300)}`, 502);
		const data = (await res.json()) as any;
		return c.json({ translation: data.response ?? "", provider: "ollama" });
	}

	return jsonError(
		c,
		"No translation model configured. Set OPENAI_API_KEY or OLLAMA_BASE_URL, or use the manual translation mode.",
		503,
		true,
	);
});

/* ------------------------------ Transcription ---------------------------- */

app.post("/api/ai/transcribe", async (c) => {
	const body = await readJson(c);
	const audio = String(body.audioBase64 ?? "");
	if (!audio) return jsonError(c, "Audio payload is required.");
	const env = c.env as Env;

	if (!env.HUGGINGFACE_TOKEN) {
		return jsonError(
			c,
			"No transcription engine configured. Set HUGGINGFACE_TOKEN to enable Whisper transcription.",
			503,
			true,
		);
	}
	const res = await fetch(
		"https://api-inference.huggingface.co/models/openai/whisper-large-v3",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.HUGGINGFACE_TOKEN}`,
			},
			body: JSON.stringify({
				inputs: audio,
				parameters: { language: body.language ?? undefined },
			}),
		},
	);
	if (!res.ok) {
		return jsonError(c, `Transcription error: ${(await res.text()).slice(0, 300)}`, 502);
	}
	const data = await res.json();
	return c.json({ text: typeof data === "string" ? data : JSON.stringify(data), provider: "huggingface" });
});

app.all("*", (c) => jsonError(c, "Unknown API route.", 404));

export default app;
