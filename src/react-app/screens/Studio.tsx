import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import {
	Button,
	EmptyState,
	Field,
	SectionHead,
	Select,
	Tabs,
	TextArea,
	TextInput,
	formatBytes,
	useToast,
} from "../components/ui";
import { IconDownload, IconImage, IconMic, IconSpark, IconTranslate, IconVideo } from "../components/icons";
import {
	blobToBase64,
	base64ToBlob,
	fetchProviders,
	generateImage,
	generateSpeech,
	generateVideo,
	ProviderError,
	translateText,
} from "../lib/providers";
import {
	ASPECT_RATIOS,
	IMAGE_PROMPT_PRESETS,
	LANGUAGES,
	NEGATIVE_PRESETS,
	VISUAL_STYLES,
	phrasebookLookup,
} from "../lib/scriptTools";
import { downloadBlob, loadBlob, makeMediaItem, saveBlob } from "../lib/media";
import type { MediaItem, ProviderInfo, Scene } from "../lib/types";

type Mode = "image" | "video" | "voice" | "translate";

const MODES: { value: Mode; label: string }[] = [
	{ value: "image", label: "Image" },
	{ value: "video", label: "Video" },
	{ value: "voice", label: "Voice" },
	{ value: "translate", label: "Translate" },
];

const VOICES = [
	{ value: "alloy", label: "alloy (neutral)" },
	{ value: "echo", label: "echo (male, calm)" },
	{ value: "fable", label: "fable (warm storyteller)" },
	{ value: "onyx", label: "onyx (deep narrator)" },
	{ value: "nova", label: "nova (bright female)" },
	{ value: "shimmer", label: "shimmer (soft female)" },
];

export default function Studio({ projectId }: { projectId?: string }) {
	const store = useStore();
	const toast = useToast();
	const [mode, setMode] = useState<Mode>("image");
	const [providers, setProviders] = useState<ProviderInfo[]>([]);
	const [providerError, setProviderError] = useState<string | null>(null);
	const [loadingProviders, setLoadingProviders] = useState(true);

	const project = store.getProject(projectId);
	const scenes = store.scenesOf(projectId);

	const [sceneId, setSceneId] = useState<string>("");
	const activeScene: Scene | undefined = useMemo(
		() => scenes.find((s) => s.id === sceneId) ?? scenes[0],
		[scenes, sceneId],
	);

	const [prompt, setPrompt] = useState("");
	const [negative, setNegative] = useState("");
	const [style, setStyle] = useState<string>(VISUAL_STYLES[0]);
	const [aspect, setAspect] = useState<string>(project?.settings.aspectRatio ?? "16:9");
	const [referenceItem, setReferenceItem] = useState<MediaItem | null>(null);
	const [referenceFile, setReferenceFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<{ id: string; url: string; kind: "image" | "video" | "audio" }[]>([]);
	const [text, setText] = useState("");
	const [language, setLanguage] = useState<string>(project?.settings.language ?? "English");
	const [voice, setVoice] = useState("alloy");
	const [speed, setSpeed] = useState("1");
	const [sourceLanguage, setSourceLanguage] = useState("English");
	const [targetLanguage, setTargetLanguage] = useState("Spanish");
	const [translation, setTranslation] = useState("");
	const [translationProvider, setTranslationProvider] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetchProviders()
			.then((res) => setProviders(res.providers))
			.catch((err: ProviderError) => setProviderError(err.message))
			.finally(() => setLoadingProviders(false));
	}, []);

	useEffect(() => {
		if (project && !sceneId && scenes.length > 0) setSceneId(scenes[0].id);
	}, [project, scenes, sceneId]);

	const configured = useMemo(
		() => providers.filter((p) => p.configured),
		[providers],
	);

	function enginesFor(kind: ProviderInfo["kind"]) {
		return configured.filter((p) => p.capabilities.includes(kind));
	}

	function requireEngine(kind: ProviderInfo["kind"]): boolean {
		const list = enginesFor(kind);
		if (list.length === 0) {
			setError(
				`No ${kind} engine is configured on the server. Add the matching API key as a Worker secret, then try again.`,
			);
			return false;
		}
		return true;
	}

	async function referenceBase64(): Promise<string | undefined> {
		if (referenceFile) return blobToBase64(referenceFile);
		if (referenceItem) {
			const blob = await loadBlob(referenceItem.id);
			if (blob) return blobToBase64(blob);
		}
		return undefined;
	}

	async function persistGenerated(
		blob: Blob,
		name: string,
		kind: MediaItem["kind"],
		note?: string,
	): Promise<MediaItem> {
		const item = makeMediaItem({
			kind,
			name,
			mime: blob.type || "application/octet-stream",
			size: blob.size,
			origin: "generated",
			projectId: project?.id,
			sceneId: activeScene?.id,
			note,
		});
		await saveBlob(item, blob);
		store.addMedia(item);
		if (project) store.logActivity(project.id, kind === "image" ? "image" : kind === "video" ? "video" : "audio", `Generated ${name}`);
		return item;
	}

	async function runImage() {
		setError(null);
		if (!prompt.trim()) {
			setError("Describe the shot you want before generating.");
			return;
		}
		if (!requireEngine("image")) return;
		setBusy(true);
		try {
			const res = await generateImage({
				prompt,
				negativePrompt: negative || undefined,
				aspectRatio: aspect,
				style,
				referenceImageBase64: await referenceBase64(),
			});
			const blob = base64ToBlob(res.imageBase64, res.mime);
			const url = URL.createObjectURL(blob);
			setResults((prev) => [{ id: crypto.randomUUID(), url, kind: "image" }, ...prev]);
			await persistGenerated(blob, `image-${Date.now()}.${res.mime.includes("png") ? "png" : "jpg"}`, "image", res.provider);
			toast("Image generated and saved to this project", "ok");
		} catch (err) {
			const message = err instanceof ProviderError ? err.message : String(err);
			setError(message);
			toast(message, "err");
		} finally {
			setBusy(false);
		}
	}

	async function runVideo() {
		setError(null);
		if (!prompt.trim()) {
			setError("Describe the motion you want before generating.");
			return;
		}
		if (!requireEngine("video")) return;
		setBusy(true);
		try {
			const res = await generateVideo({
				prompt,
				negativePrompt: negative || undefined,
				aspectRatio: aspect,
				durationSec: 5,
				startImageBase64: await referenceBase64(),
			});
			const blob = base64ToBlob(res.videoBase64, res.mime);
			const url = URL.createObjectURL(blob);
			setResults((prev) => [{ id: crypto.randomUUID(), url, kind: "video" }, ...prev]);
			await persistGenerated(blob, `clip-${Date.now()}.mp4`, "video", res.provider);
			toast("Clip generated and saved to this project", "ok");
		} catch (err) {
			const message = err instanceof ProviderError ? err.message : String(err);
			setError(message);
			toast(message, "err");
		} finally {
			setBusy(false);
		}
	}

	async function runSpeech() {
		setError(null);
		if (!text.trim()) {
			setError("Add narration or dialogue text to synthesise.");
			return;
		}
		if (!requireEngine("speech")) return;
		setBusy(true);
		try {
			const res = await generateSpeech({
				text,
				voice,
				speed: Number(speed) || 1,
				language,
			});
			const blob = base64ToBlob(res.audioBase64, res.mime);
			const url = URL.createObjectURL(blob);
			setResults((prev) => [{ id: crypto.randomUUID(), url, kind: "audio" }, ...prev]);
			await persistGenerated(blob, `voice-${Date.now()}.mp3`, "audio", res.provider);
			toast("Audio created and saved to this project", "ok");
		} catch (err) {
			const message = err instanceof ProviderError ? err.message : String(err);
			setError(message);
			toast(message, "err");
		} finally {
			setBusy(false);
		}
	}

	async function runTranslate() {
		setError(null);
		setTranslation("");
		setTranslationProvider(null);
		if (!text.trim()) {
			setError("Add the text to translate.");
			return;
		}
		setBusy(true);
		try {
			const res = await translateText({
				text,
				sourceLanguage,
				targetLanguage,
			});
			setTranslation(res.translation);
			setTranslationProvider(res.provider);
			toast("Translation received", "ok");
		} catch (err) {
			const message = err instanceof ProviderError ? err.message : String(err);
			setError(message);
			toast(message, "err");
		} finally {
			setBusy(false);
		}
	}

	function applyPhrasebook() {
		const hit = phrasebookLookup(text, targetLanguage);
		if (!hit) {
			setError(
				`The local phrasebook has no entry for that text in ${targetLanguage}. Use a configured translation engine for full text.`,
			);
			return;
		}
		setTranslation(hit);
		setTranslationProvider("local phrasebook");
		setError(null);
	}

	function downloadResult(url: string, name: string) {
		fetch(url)
			.then((r) => r.blob())
			.then((blob) => downloadBlob(blob, name))
			.catch(() => toast("Could not read the generated file", "err"));
	}

	const engineSummary =
		mode === "image"
			? enginesFor("image")
			: mode === "video"
				? enginesFor("video")
				: mode === "voice"
					? enginesFor("speech")
					: enginesFor("translation");

	return (
		<div className="stack" style={{ gap: 16 }}>
			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead
					title="AI Studio"
					sub="Generate images, clips, narration and translations from a real configured engine"
					right={
						<div className="row" style={{ gap: 6 }}>
							{configured.length === 0 && !loadingProviders && (
								<span className="badge badge--warn">No engine configured</span>
							)}
							{configured.length > 0 && (
								<span className="badge badge--ok">{configured.length} engine{configured.length > 1 ? "s" : ""}</span>
							)}
						</div>
					}
				/>
				<Tabs<Mode> tabs={MODES} value={mode} onChange={setMode} />
				{providerError && <p className="tiny faint">{providerError}</p>}
				{engineSummary.length > 0 ? (
					<p className="tiny faint">
						Available: {engineSummary.map((p) => p.label).join(", ")}
					</p>
				) : (
					<p className="tiny faint">
						No {mode} engine is configured yet. You can still write and save prompts, then generate once an
						engine is added. See Settings → AI providers.
					</p>
				)}
			</div>

			{mode !== "translate" && scenes.length > 0 && (
				<div className="card">
					<Field label="Assign result to scene" hint="Generated media is linked to the selected scene.">
						{(id) => (
							<Select id={id} value={activeScene?.id ?? ""} onChange={(e) => setSceneId(e.target.value)}>
								{scenes.map((s) => (
									<option key={s.id} value={s.id}>
										Scene {s.number} — {s.title || "Untitled"}
									</option>
								))}
							</Select>
						)}
					</Field>
				</div>
			)}

			<div className="card stack" style={{ gap: 12 }}>
				{mode === "image" && (
					<>
						<Field label="Image prompt">
							{(id) => (
								<TextArea
									id={id}
									rows={4}
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									placeholder="Ancient Egyptian harbour at dawn, long lens, warm sandstone light…"
								/>
							)}
						</Field>
						<Field label="Negative prompt" hint="Only sent when the configured engine supports it.">
							{(id) => (
								<TextArea id={id} rows={2} value={negative} onChange={(e) => setNegative(e.target.value)} />
							)}
						</Field>
						<div className="row row--wrap" style={{ gap: 8 }}>
							{IMAGE_PROMPT_PRESETS.map((p) => (
								<button
									key={p.id}
									type="button"
									className="chip"
									onClick={() => setPrompt((prev) => (prev ? `${prev}, ${p.prompt}` : p.prompt))}
								>
									{p.label}
								</button>
							))}
						</div>
						<div className="row row--wrap" style={{ gap: 8 }}>
							{NEGATIVE_PRESETS.map((p) => (
								<button key={p} type="button" className="chip" onClick={() => setNegative(p)}>
									{p.slice(0, 28)}…
								</button>
							))}
						</div>
						<div className="row row--wrap" style={{ gap: 12 }}>
							<div style={{ flex: "1 1 180px" }}>
								<Field label="Aspect ratio">
									{(id) => (
										<Select id={id} value={aspect} onChange={(e) => setAspect(e.target.value)}>
											{ASPECT_RATIOS.map((r) => (
												<option key={r} value={r}>
													{r}
												</option>
											))}
										</Select>
									)}
								</Field>
							</div>
							<div style={{ flex: "1 1 180px" }}>
								<Field label="Visual style">
									{(id) => (
										<Select id={id} value={style} onChange={(e) => setStyle(e.target.value)}>
											{VISUAL_STYLES.map((s) => (
												<option key={s} value={s}>
													{s}
												</option>
											))}
										</Select>
									)}
								</Field>
							</div>
						</div>
						<ReferencePicker
							fileRef={fileRef}
							file={referenceFile}
							item={referenceItem}
							onFile={(f) => {
								setReferenceFile(f);
								setReferenceItem(null);
							}}
							onItem={(m) => {
								setReferenceItem(m);
								setReferenceFile(null);
							}}
							media={store.media.filter((m) => m.kind === "image")}
						/>
						<Button onClick={runImage} busy={busy} icon={<IconSpark size={17} />} block>
							Generate image
						</Button>
					</>
				)}

				{mode === "video" && (
					<>
						<Field label="Video prompt">
							{(id) => (
								<TextArea
									id={id}
									rows={4}
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									placeholder="Slow dolly forward through the temple hall, dust drifting in sunbeams…"
								/>
							)}
						</Field>
						<Field label="Negative prompt">
							{(id) => (
								<TextArea id={id} rows={2} value={negative} onChange={(e) => setNegative(e.target.value)} />
							)}
						</Field>
						<div className="row row--wrap" style={{ gap: 12 }}>
							<div style={{ flex: "1 1 180px" }}>
								<Field label="Aspect ratio">
									{(id) => (
										<Select id={id} value={aspect} onChange={(e) => setAspect(e.target.value)}>
											{ASPECT_RATIOS.map((r) => (
												<option key={r} value={r}>
													{r}
												</option>
											))}
										</Select>
									)}
								</Field>
							</div>
							<div style={{ flex: "1 1 180px" }}>
								<Field label="Clip length" hint="Engine dependent. Long films are assembled from several clips.">
									{(id) => <TextInput id={id} value="5" readOnly />}
								</Field>
							</div>
						</div>
						<ReferencePicker
							fileRef={fileRef}
							file={referenceFile}
							item={referenceItem}
							onFile={(f) => {
								setReferenceFile(f);
								setReferenceItem(null);
							}}
							onItem={(m) => {
								setReferenceItem(m);
								setReferenceFile(null);
							}}
							media={store.media.filter((m) => m.kind === "image" || m.kind === "video")}
							accept="image/*,video/*"
						/>
						<Button onClick={runVideo} busy={busy} icon={<IconVideo size={17} />} block>
							Generate clip
						</Button>
					</>
				)}

				{mode === "voice" && (
					<>
						<Field label="Narration or dialogue" hint="Speaker labels such as 'NARRATOR:' are spoken as written.">
							{(id) => (
								<TextArea
									id={id}
									rows={5}
									value={text}
									onChange={(e) => setText(e.target.value)}
									placeholder="NARRATOR: The Nile carried more than water…"
								/>
							)}
						</Field>
						{activeScene?.narration && (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setText(activeScene.narration)}
							>
								Use scene {activeScene.number} narration
							</Button>
						)}
						<div className="row row--wrap" style={{ gap: 12 }}>
							<div style={{ flex: "1 1 160px" }}>
								<Field label="Language">
									{(id) => (
										<Select id={id} value={language} onChange={(e) => setLanguage(e.target.value)}>
											{LANGUAGES.map((l) => (
												<option key={l} value={l}>
													{l}
												</option>
											))}
										</Select>
									)}
								</Field>
							</div>
							<div style={{ flex: "1 1 160px" }}>
								<Field label="Voice">
									{(id) => (
										<Select id={id} value={voice} onChange={(e) => setVoice(e.target.value)}>
											{VOICES.map((v) => (
												<option key={v.value} value={v.value}>
													{v.label}
												</option>
											))}
										</Select>
									)}
								</Field>
							</div>
							<div style={{ flex: "1 1 120px" }}>
								<Field label="Speed">
									{(id) => (
										<TextInput
											id={id}
											type="number"
											min={0.5}
											max={2}
											step={0.05}
											value={speed}
											onChange={(e) => setSpeed(e.target.value)}
										/>
									)}
								</Field>
							</div>
						</div>
						<Button onClick={runSpeech} busy={busy} icon={<IconMic size={17} />} block>
							Create audio
						</Button>
						<p className="tiny faint">
							Only clone or reuse a voice you own or have explicit permission to use. Recordings of real people
							need their consent.
						</p>
					</>
				)}

				{mode === "translate" && (
					<>
						<div className="row row--wrap" style={{ gap: 12 }}>
							<div style={{ flex: "1 1 160px" }}>
								<Field label="Source language">
									{(id) => (
										<Select id={id} value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
											{LANGUAGES.map((l) => (
												<option key={l} value={l}>
													{l}
												</option>
											))}
										</Select>
									)}
								</Field>
							</div>
							<div style={{ flex: "1 1 160px" }}>
								<Field label="Target language">
									{(id) => (
										<Select id={id} value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
											{LANGUAGES.map((l) => (
												<option key={l} value={l}>
													{l}
												</option>
											))}
										</Select>
									)}
								</Field>
							</div>
						</div>
						<Field label="Text to translate" hint="Keep SPEAKER labels to preserve dialogue attribution.">
							{(id) => (
								<TextArea id={id} rows={5} value={text} onChange={(e) => setText(e.target.value)} />
							)}
						</Field>
						<div className="row row--wrap" style={{ gap: 8 }}>
							<Button onClick={runTranslate} busy={busy} icon={<IconTranslate size={17} />}>
								Translate
							</Button>
							<Button variant="ghost" onClick={applyPhrasebook}>
								Local phrasebook lookup
							</Button>
						</div>
						<Field label="Translation (editable)">
							{(id) => (
								<TextArea
									id={id}
									rows={5}
									value={translation}
									onChange={(e) => setTranslation(e.target.value)}
								/>
							)}
						</Field>
						{translationProvider && (
							<p className="tiny faint">Produced by: {translationProvider}. Review before publishing.</p>
						)}
						<Button
							variant="ghost"
							icon={<IconDownload size={16} />}
							disabled={!translation}
							onClick={() => {
								const blob = new Blob([translation], { type: "text/plain;charset=utf-8" });
								downloadBlob(blob, `translation-${targetLanguage.toLowerCase()}.txt`);
							}}
						>
							Export translation
						</Button>
					</>
				)}

				{error && (
					<p className="small" style={{ color: "var(--err)" }}>
						{error}
					</p>
				)}
			</div>

			{results.length > 0 && (
				<div className="card stack" style={{ gap: 12 }}>
					<SectionHead title="Results" sub="Generated in this session and saved to the media library" />
					<div className="thumb-grid">
						{results.map((r) => (
							<div key={r.id} className="thumb">
								{r.kind === "image" && <img src={r.url} alt="Generated result" />}
								{r.kind === "video" && <video src={r.url} controls playsInline />}
								{r.kind === "audio" && <audio src={r.url} controls style={{ width: "100%" }} />}
								<div className="thumb__label">
									<Button
										size="sm"
										variant="ghost"
										icon={<IconDownload size={14} />}
										onClick={() => downloadResult(r.url, `result-${r.id}.${r.kind === "audio" ? "mp3" : r.kind}`)}
									>
										Save
									</Button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{results.length === 0 && (
				<div className="card">
					<EmptyState
						title="No results yet"
						body={
							engineSummary.length === 0
								? "Configure an engine to generate real output. Prompts and settings stay saved locally in the meantime."
								: "Run a generation to see the real output from the configured engine here."
						}
						action={
							engineSummary.length === 0 ? (
								<span className="row" style={{ gap: 8 }}>
									{mode === "image" && <IconImage size={18} />}
									{mode === "video" && <IconVideo size={18} />}
									{mode === "voice" && <IconMic size={18} />}
									{mode === "translate" && <IconTranslate size={18} />}
					</span>
							) : undefined
						}
					/>
				</div>
			)}
		</div>
	);
}

function ReferencePicker({
	fileRef,
	file,
	item,
	onFile,
	onItem,
	media,
	accept = "image/*",
}: {
	fileRef: React.RefObject<HTMLInputElement | null>;
	file: File | null;
	item: MediaItem | null;
	onFile: (f: File) => void;
	onItem: (m: MediaItem) => void;
	media: MediaItem[];
	accept?: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<div className="stack" style={{ gap: 8 }}>
			<div className="row row--between">
				<span className="field__label">Reference {accept.startsWith("image") ? "image" : "media"}</span>
				<Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
					{open ? "Hide library" : "Pick from library"}
				</Button>
			</div>
			<label className="file-drop">
				<input
					ref={fileRef}
					type="file"
					accept={accept}
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) onFile(f);
					}}
				/>
				<span>{file ? file.name : "Upload a reference file"}</span>
			</label>
			{item && (
				<p className="tiny faint">
					Using library file: {item.name} ({formatBytes(item.size)})
				</p>
			)}
			{open && (
				<div className="thumb-grid">
					{media.length === 0 && <p className="tiny faint">No matching media yet.</p>}
					{media.map((m) => (
						<button
							key={m.id}
							type="button"
							className="thumb"
							onClick={() => {
								onItem(m);
								setOpen(false);
							}}
						>
							<span className="thumb__label">{m.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
