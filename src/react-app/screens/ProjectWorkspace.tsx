import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { navigateTo } from "../lib/router";
import {
	Button,
	Checkbox,
	Chips,
	ConfirmDialog,
	EmptyState,
	Field,
	Modal,
	Select,
	Tabs,
	TextArea,
	TextInput,
	formatDuration,
	useToast,
} from "../components/ui";
import {
	IconArrowDown,
	IconArrowUp,
	IconCopy,
	IconDownload,
	IconPlus,
	IconTrash,
} from "../components/icons";
import { downloadText } from "../lib/media";
import {
	ASPECT_RATIOS,
	LANGUAGES,
	VISUAL_STYLES,
	buildOutline,
	estimateSceneDuration,
	parseScriptText,
	scriptToText,
} from "../lib/scriptTools";
import type { Character, Scene } from "../lib/types";

type Tab = "script" | "characters" | "scenes";

const WORKFLOW = [
	"Write or import the script",
	"Break it into scenes",
	"Review each scene prompt",
	"Assign characters and references",
	"Generate a keyframe image",
	"Generate a video clip",
	"Create narration audio",
	"Preview and approve",
	"Assemble in the editor",
];

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
	const store = useStore();
	const toast = useToast();
	const project = store.getProject(projectId);
	const [tab, setTab] = useState<Tab>("scenes");

	if (!project) {
		return (
			<EmptyState
				title="Project not found"
				body="This project may have been deleted on this device."
				action={
					<Button onClick={() => navigateTo("/library")}>Back to projects</Button>
				}
			/>
		);
	}

	const scenes = store.scenesOf(projectId);
	const characters = store.charactersOf(projectId);

	return (
		<div className="stack" style={{ gap: 16 }}>
			<div className="card stack" style={{ gap: 10 }}>
				<div className="row row--between row--wrap" style={{ gap: 8 }}>
					<h1 className="card__title" style={{ margin: 0 }}>
						{project.title}
					</h1>
					<span className="badge badge--violet">{project.settings.aspectRatio}</span>
				</div>
				<p className="muted small" style={{ margin: 0 }}>
					{project.description || "No description yet."}
				</p>
				<div className="row row--wrap" style={{ gap: 8 }}>
					<span className="badge">{scenes.length} scenes</span>
					<span className="badge">{characters.length} characters</span>
					<span className="badge">
						Target {formatDuration(project.settings.targetDurationSec)}
					</span>
					<span className={`badge badge--${project.status === "exported" ? "ok" : "warn"}`}>
						{project.status}
					</span>
				</div>
				<div className="row row--wrap" style={{ gap: 8 }}>
					<Button size="sm" onClick={() => navigateTo(`/editor/${projectId}`)}>
						Open editor
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => {
							store.logActivity(projectId, "project", "Opened workspace");
							toast("Workspace ready", "ok");
						}}
					>
						Log activity
					</Button>
				</div>
			</div>

			<Tabs<Tab>
				tabs={[
					{ value: "script", label: "Script" },
					{ value: "characters", label: `Characters (${characters.length})` },
					{ value: "scenes", label: `Scenes (${scenes.length})` },
				]}
				value={tab}
				onChange={setTab}
			/>

			{tab === "script" && <ScriptPanel projectId={projectId} />}
			{tab === "characters" && <CharactersPanel projectId={projectId} />}
			{tab === "scenes" && <ScenesPanel projectId={projectId} />}
		</div>
	);
}

/* --------------------------------- Script --------------------------------- */

function ScriptPanel({ projectId }: { projectId: string }) {
	const store = useStore();
	const toast = useToast();
	const project = store.getProject(projectId)!;
	const script = store.scripts[projectId];
	const [draft, setDraft] = useState(() => ({
		premise: script?.premise ?? project.premise,
		audience: script?.audience ?? project.settings.audience,
		genre: script?.genre ?? project.genre,
		tone: script?.tone ?? project.settings.narrationStyle,
		targetDurationSec: script?.targetDurationSec ?? project.settings.targetDurationSec,
	}));
	const [aiPrompt, setAiPrompt] = useState("");
	const [aiResult, setAiResult] = useState("");
	const [aiBusy, setAiBusy] = useState(false);
	const [aiError, setAiError] = useState("");

	const scenes = store.scenesOf(projectId);
	const runningTotal = scenes.reduce((sum, s) => sum + estimateSceneDuration(s), 0);

	function save() {
		store.setScript(projectId, {
			premise: draft.premise,
			audience: draft.audience,
			genre: draft.genre,
			tone: draft.tone,
			targetDurationSec: draft.targetDurationSec,
			chapters: script?.chapters ?? [],
			updatedAt: Date.now(),
		});
		store.logActivity(projectId, "script", "Saved script details");
		toast("Script saved", "ok");
	}

	function exportJson() {
		downloadText(
			JSON.stringify(
				{
					project: projectId,
					script: { ...draft, updatedAt: Date.now() },
					scenes: scenes.map((s) => ({ ...s })),
				},
				null,
				2,
			),
			`${project.title.replace(/\s+/g, "-").toLowerCase()}-script.json`,
			"application/json",
		);
		toast("Exported JSON", "ok");
	}

	function exportTxt() {
		downloadText(
			scriptToText(draft, scenes),
			`${project.title.replace(/\s+/g, "-").toLowerCase()}-script.txt`,
		);
		toast("Exported text", "ok");
	}

	function importTxt() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".txt,.md,text/plain";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				const parsed = parseScriptText(text);
				if (parsed.scenes.length === 0) {
					toast("No scenes found in that file", "err");
					return;
				}
				for (const s of parsed.scenes) {
					store.createScene(projectId, s);
				}
				store.logActivity(projectId, "script", `Imported ${parsed.scenes.length} scenes`);
				toast(`Imported ${parsed.scenes.length} scenes`, "ok");
			} catch {
				toast("Could not read that file", "err");
			}
		};
		input.click();
	}

	function makeOutline() {
		const outline = buildOutline({
			title: project.title,
			premise: draft.premise,
			audience: draft.audience,
			durationSec: draft.targetDurationSec,
			filmType: project.filmType,
		});
		for (const chapter of outline.chapters) {
			for (const beat of chapter.beats) {
				store.createScene(projectId, {
					title: beat.replace(/\s*\(\d+s\)\s*$/, ""),
					purpose: chapter.title,
				});
			}
		}
		store.logActivity(projectId, "script", "Created template outline");
		toast("Template outline created (local template, not AI)", "ok");
	}

	async function runAi() {
		setAiBusy(true);
		setAiError("");
		try {
			const { generateText } = await import("../lib/providers");
			const res = await generateText({
				prompt: aiPrompt,
				system:
					"You are a screenwriter. Return a structured script with scene headings, narration and dialogue. Plain text.",
			});
			setAiResult(res.text);
			store.logActivity(projectId, "script", "Generated draft with AI provider");
		} catch (err) {
			setAiError(
				err instanceof Error
					? err.message
					: "The AI provider could not be reached.",
			);
		} finally {
			setAiBusy(false);
		}
	}

	return (
		<div className="stack" style={{ gap: 16 }}>
			<div className="card stack" style={{ gap: 14 }}>
				<h2 className="card__title">Script details</h2>
				<Field label="Premise">
					{(id) => (
						<TextArea
							id={id}
							rows={3}
							value={draft.premise}
							onChange={(e) => setDraft({ ...draft, premise: e.target.value })}
						/>
					)}
				</Field>
				<div className="grid grid--2">
					<Field label="Audience">
						{(id) => (
							<TextInput
								id={id}
								value={draft.audience}
								onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
							/>
						)}
					</Field>
					<Field label="Genre">
						{(id) => (
							<TextInput
								id={id}
								value={draft.genre}
								onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
							/>
						)}
					</Field>
				</div>
				<div className="grid grid--2">
					<Field label="Tone / narration style">
						{(id) => (
							<TextInput
								id={id}
								value={draft.tone}
								onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
							/>
						)}
					</Field>
					<Field label="Target duration (seconds)">
						{(id) => (
							<TextInput
								id={id}
								type="number"
								min={5}
								value={draft.targetDurationSec}
								onChange={(e) =>
									setDraft({
										...draft,
										targetDurationSec: Math.max(5, Number(e.target.value) || 5),
									})
								}
							/>
						)}
					</Field>
				</div>
				<div className="row row--wrap" style={{ gap: 8 }}>
					<Button size="sm" onClick={save}>
						Save script
					</Button>
					<Button size="sm" variant="ghost" onClick={exportTxt}>
						Export TXT
					</Button>
					<Button size="sm" variant="ghost" onClick={exportJson}>
						Export JSON
					</Button>
					<Button size="sm" variant="ghost" onClick={importTxt}>
						Import script
					</Button>
					<Button size="sm" variant="ghost" onClick={makeOutline}>
						Template outline
					</Button>
				</div>
				<p className="tiny faint" style={{ margin: 0 }}>
					"Template outline" is a local, deterministic structure — not AI output.
				</p>
			</div>

			<div className="card stack" style={{ gap: 12 }}>
				<h2 className="card__title">Duration</h2>
				<div className="kv">
					<span className="kv__k">Estimated from {scenes.length} scenes</span>
					<span className="kv__v">{formatDuration(runningTotal)}</span>
				</div>
				<div className="kv">
					<span className="kv__k">Target</span>
					<span className="kv__v">{formatDuration(draft.targetDurationSec)}</span>
				</div>
				<p className="tiny faint" style={{ margin: 0 }}>
					Estimates use words-per-minute plus a beat allowance. Actual length depends on
					the generation engine and clip limits.
				</p>
			</div>

			<div className="card stack" style={{ gap: 12 }}>
				<h2 className="card__title">AI prompt builder</h2>
				<p className="tiny faint" style={{ margin: 0 }}>
					Build a prompt to paste into any engine, or send it to a connected provider
					below. Prompts are only sent when a provider is configured and you allow
					external uploads.
				</p>
				<Field label="Extra instruction">
					{(id) => (
						<TextArea
							id={id}
							rows={3}
							value={aiPrompt}
							onChange={(e) => setAiPrompt(e.target.value)}
							placeholder="e.g. Write a 60 second documentary intro about the Nile"
						/>
					)}
				</Field>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => {
						const built = [
							`Title: ${project.title}`,
							`Premise: ${draft.premise}`,
							`Audience: ${draft.audience}`,
							`Genre: ${draft.genre}`,
							`Tone: ${draft.tone}`,
							`Target duration: ${draft.targetDurationSec} seconds`,
							`Language: ${project.settings.language}`,
							aiPrompt.trim(),
						]
							.filter(Boolean)
							.join("\n");
						setAiPrompt(built);
						toast("Prompt built", "ok");
					}}
				>
					Build prompt
				</Button>
				<div className="row row--wrap" style={{ gap: 8 }}>
					<Button size="sm" onClick={runAi} busy={aiBusy}>
						Send to connected provider
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => {
							navigator.clipboard
								?.writeText(aiPrompt)
								.then(() => toast("Prompt copied", "ok"))
								.catch(() => toast("Clipboard unavailable", "err"));
						}}
					>
						Copy prompt
					</Button>
				</div>
				{aiError && <div className="banner banner--err">{aiError}</div>}
				{aiResult && (
					<>
						<TextArea
							rows={8}
							value={aiResult}
							onChange={(e) => setAiResult(e.target.value)}
						/>
						<Button
							size="sm"
							onClick={() => {
								const parsed = parseScriptText(aiResult);
								for (const s of parsed.scenes) store.createScene(projectId, s);
								store.logActivity(projectId, "script", "Created scenes from AI draft");
								toast(`Added ${parsed.scenes.length} scenes`, "ok");
							}}
						>
							Create scenes from this text
						</Button>
					</>
				)}
			</div>
		</div>
	);
}

/* ------------------------------- Characters ------------------------------- */

function CharactersPanel({ projectId }: { projectId: string }) {
	const store = useStore();
	const toast = useToast();
	const characters = store.charactersOf(projectId);
	const [editing, setEditing] = useState<Character | null>(null);
	const [confirm, setConfirm] = useState<Character | null>(null);
	const [showArchived, setShowArchived] = useState(false);

	const visible = characters.filter((c) => showArchived || !c.archived);

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="row row--between row--wrap" style={{ gap: 8 }}>
				<Checkbox
					label="Show archived"
					checked={showArchived}
					onChange={setShowArchived}
				/>
				<Button
					size="sm"
					icon={<IconPlus size={16} />}
					onClick={() => {
						const c = store.createCharacter(projectId);
						if (c) setEditing(c);
					}}
				>
					New character
				</Button>
			</div>

			{visible.length === 0 ? (
				<EmptyState
					title="No characters yet"
					body="Create the people who appear in your film so prompts and dialogue stay consistent."
					action={
						<Button
							onClick={() => {
								const c = store.createCharacter(projectId);
								if (c) setEditing(c);
							}}
						>
							Create a character
						</Button>
					}
				/>
			) : (
				<div className="grid grid--auto">
					{visible.map((c) => (
						<div key={c.id} className="card stack" style={{ gap: 8 }}>
							<div className="row row--between" style={{ gap: 8 }}>
								<h3 className="card__title" style={{ margin: 0 }}>
									{c.name}
								</h3>
								{c.archived && <span className="badge badge--warn">archived</span>}
							</div>
							<p className="muted small" style={{ margin: 0 }}>
								{c.role || "Role not set"}
							</p>
							<p className="tiny faint" style={{ margin: 0 }}>
								{c.appearance || c.personality || "No description yet."}
							</p>
							<div className="row row--wrap" style={{ gap: 6 }}>
								<Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
									Edit
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										store.duplicateCharacter(c.id);
										toast("Character duplicated", "ok");
									}}
								>
									Duplicate
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										store.updateCharacter(c.id, { archived: !c.archived });
									}}
								>
									{c.archived ? "Unarchive" : "Archive"}
								</Button>
								<Button size="sm" variant="danger" onClick={() => setConfirm(c)}>
									Delete
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<CharacterEditor
				character={editing}
				onClose={() => setEditing(null)}
				onSave={(patch) => {
					if (editing) store.updateCharacter(editing.id, patch);
				}}
			/>

			<ConfirmDialog
				open={Boolean(confirm)}
				title="Delete character?"
				message={`"${confirm?.name}" will be removed from this project and from any scene that uses them. This cannot be undone.`}
				confirmLabel="Delete"
				danger
				onCancel={() => setConfirm(null)}
				onConfirm={() => {
					if (confirm) store.deleteCharacter(confirm.id);
					setConfirm(null);
					toast("Character deleted", "ok");
				}}
			/>
		</div>
	);
}

function CharacterEditor({
	character,
	onClose,
	onSave,
}: {
	character: Character | null;
	onClose: () => void;
	onSave: (patch: Partial<Character>) => void;
}) {
	const toast = useToast();
	const [draft, setDraft] = useState<Partial<Character>>({});
	const [refInput, setRefInput] = useState<HTMLInputElement | null>(null);

	useEffect(() => {
		setDraft(character ?? {});
	}, [character]);

	if (!character) return null;

	return (
		<Modal
			open
			title={character.name || "Character"}
			onClose={onClose}
			footer={
				<>
					<Button variant="ghost" block onClick={onClose}>
						Cancel
					</Button>
					<Button
						block
						onClick={() => {
							onSave(draft);
							onClose();
							toast("Character saved", "ok");
						}}
					>
						Save
					</Button>
				</>
			}
		>
			<Field label="Name">
				{(id) => (
					<TextInput
						id={id}
						value={draft.name ?? ""}
						onChange={(e) => setDraft({ ...draft, name: e.target.value })}
					/>
				)}
			</Field>
			<div className="grid grid--2">
				<Field label="Age range">
					{(id) => (
						<TextInput
							id={id}
							value={draft.ageRange ?? ""}
							onChange={(e) => setDraft({ ...draft, ageRange: e.target.value })}
							placeholder="30-40"
						/>
					)}
				</Field>
				<Field label="Role">
					{(id) => (
						<TextInput
							id={id}
							value={draft.role ?? ""}
							onChange={(e) => setDraft({ ...draft, role: e.target.value })}
						/>
					)}
				</Field>
			</div>
			<Field label="Personality">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.personality ?? ""}
						onChange={(e) => setDraft({ ...draft, personality: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Appearance">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.appearance ?? ""}
						onChange={(e) => setDraft({ ...draft, appearance: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Clothing">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.clothing ?? ""}
						onChange={(e) => setDraft({ ...draft, clothing: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Voice description">
				{(id) => (
					<TextInput
						id={id}
						value={draft.voice ?? ""}
						onChange={(e) => setDraft({ ...draft, voice: e.target.value })}
						placeholder="Low, steady narrator"
					/>
				)}
			</Field>
			<Field label="Background">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.background ?? ""}
						onChange={(e) => setDraft({ ...draft, background: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Reusable character prompt" hint="Paste this into your image engine.">
				{(id) => (
					<TextArea
						id={id}
						rows={3}
						value={draft.prompt ?? ""}
						onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Visual continuity notes">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.continuityNotes ?? ""}
						onChange={(e) => setDraft({ ...draft, continuityNotes: e.target.value })}
					/>
				)}
			</Field>
			<div className="stack" style={{ gap: 8 }}>
				<span className="field__label">Reference images</span>
				<p className="tiny faint" style={{ margin: 0 }}>
					Reference images are stored on this device. No model guarantees an identical
					face across every generation.
				</p>
				<div className="row row--wrap" style={{ gap: 6 }}>
					{(draft.referenceImageIds ?? []).length === 0 && (
						<span className="tiny faint">No images attached.</span>
					)}
					{(draft.referenceImageIds ?? []).map((id) => (
						<span key={id} className="badge">
							image {id.slice(-4)}
						</span>
					))}
				</div>
				<input
					ref={setRefInput}
					type="file"
					accept="image/*"
					hidden
					onChange={async (e) => {
						const file = e.target.files?.[0];
						e.target.value = "";
						if (!file) return;
						const { makeMediaItem, saveBlob } = await import("../lib/media");
						const item = makeMediaItem({
							kind: "image",
							name: file.name,
							mime: file.type || "image/png",
							size: file.size,
							origin: "import",
							projectId: character.projectId,
						});
						const ok = await saveBlob(item, file);
						if (!ok) {
							toast("Could not store that image", "err");
							return;
						}
						store.addMedia(item);
						setDraft({
							...draft,
							referenceImageIds: [...(draft.referenceImageIds ?? []), item.id],
						});
					}}
				/>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => refInput?.click()}
				>
					Add reference image
				</Button>
			</div>
		</Modal>
	);
}

/* --------------------------------- Scenes --------------------------------- */

function ScenesPanel({ projectId }: { projectId: string }) {
	const store = useStore();
	const toast = useToast();
	const scenes = store.scenesOf(projectId);
	const characters = store.charactersOf(projectId);
	const [selectedId, setSelectedId] = useState<string | null>(scenes[0]?.id ?? null);
	const [confirm, setConfirm] = useState<Scene | null>(null);
	const [showWorkflow, setShowWorkflow] = useState(true);

	const selected = scenes.find((s) => s.id === selectedId) ?? scenes[0] ?? null;
	const approved = scenes.filter((s) => s.approved).length;

	useEffect(() => {
		if (!selectedId && scenes[0]) setSelectedId(scenes[0].id);
	}, [scenes, selectedId]);

	const index = selected ? scenes.findIndex((s) => s.id === selected.id) : -1;

	function go(delta: number) {
		const next = scenes[index + delta];
		if (next) setSelectedId(next.id);
	}

	return (
		<div className="stack" style={{ gap: 14 }}>
			<div className="card stack" style={{ gap: 10 }}>
				<div className="row row--between row--wrap" style={{ gap: 8 }}>
					<div>
						<h2 className="card__title" style={{ margin: 0 }}>
							Scene workflow
						</h2>
						<p className="tiny faint" style={{ margin: 0 }}>
							{approved} of {scenes.length} scenes approved
						</p>
					</div>
					<Button size="sm" variant="ghost" onClick={() => setShowWorkflow((v) => !v)}>
						{showWorkflow ? "Hide" : "Show"} steps
					</Button>
				</div>
				{showWorkflow && (
					<ol className="stack" style={{ gap: 4, margin: 0, paddingLeft: 18 }}>
						{WORKFLOW.map((w) => (
							<li key={w} className="small muted">
								{w}
							</li>
						))}
					</ol>
				)}
			</div>

			<div className="row row--between row--wrap" style={{ gap: 8 }}>
				<Button
					size="sm"
					icon={<IconPlus size={16} />}
					onClick={() => {
						const s = store.createScene(projectId);
						if (s) {
							setSelectedId(s.id);
							store.logActivity(projectId, "scene", `Added scene ${s.number}`);
						}
					}}
				>
					Add scene
				</Button>
				<span className="tiny faint">
					Estimated total {formatDuration(scenes.reduce((a, s) => a + s.durationSec, 0))}
				</span>
			</div>

			{scenes.length === 0 ? (
				<EmptyState
					title="No scenes yet"
					body="Break your script into scenes, then give each one a purpose, prompt and narration."
					action={
						<Button
							onClick={() => {
								const s = store.createScene(projectId);
								if (s) setSelectedId(s.id);
							}}
						>
							Add the first scene
						</Button>
					}
				/>
			) : (
				<div className="stack" style={{ gap: 12 }}>
					<div className="thumb-grid">
						{scenes.map((s) => (
							<button
								key={s.id}
								type="button"
								className={`scene-card ${selected?.id === s.id ? "scene-card--active" : ""}`}
								onClick={() => setSelectedId(s.id)}
								aria-pressed={selected?.id === s.id}
							>
								<span className="scene-card__num">{s.number}</span>
								<span className="scene-card__title">{s.title}</span>
								<span className="tiny faint">{formatDuration(s.durationSec)}</span>
								<span className={`badge badge--${statusTone(s.status)}`}>{s.status}</span>
							</button>
						))}
					</div>

					{selected && (
						<SceneEditor
							scene={selected}
							characters={characters}
							onPrev={() => go(-1)}
							onNext={() => go(1)}
							hasPrev={index > 0}
							hasNext={index < scenes.length - 1}
							onMove={(dir) => {
								store.moveScene(projectId, selected.id, dir);
								toast("Scene reordered", "ok");
							}}
							onDuplicate={() => {
								const copy = store.duplicateScene(selected.id);
								if (copy) setSelectedId(copy.id);
								toast("Scene duplicated", "ok");
							}}
							onDelete={() => setConfirm(selected)}
						/>
					)}
				</div>
			)}

			<ConfirmDialog
				open={Boolean(confirm)}
				title="Delete scene?"
				message={`"${confirm?.title}" and its prompt notes will be removed. Media already generated for it stays in the media library.`}
				confirmLabel="Delete"
				danger
				onCancel={() => setConfirm(null)}
				onConfirm={() => {
					if (confirm) {
						store.deleteScene(confirm.id);
						setSelectedId(null);
					}
					setConfirm(null);
					toast("Scene deleted", "ok");
				}}
			/>
		</div>
	);
}

function statusTone(status: string): "ok" | "warn" | "err" | "violet" {
	if (status === "approved") return "ok";
	if (status === "draft") return "warn";
	if (status === "image" || status === "video" || status === "audio") return "violet";
	return "warn";
}

function SceneEditor({
	scene,
	characters,
	onPrev,
	onNext,
	hasPrev,
	hasNext,
	onMove,
	onDuplicate,
	onDelete,
}: {
	scene: Scene;
	characters: Character[];
	onPrev: () => void;
	onNext: () => void;
	hasPrev: boolean;
	hasNext: boolean;
	onMove: (dir: -1 | 1) => void;
	onDuplicate: () => void;
	onDelete: () => void;
}) {
	const store = useStore();
	const toast = useToast();
	const [draft, setDraft] = useState<Scene>(scene);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [speaker, setSpeaker] = useState("");
	const [lineText, setLineText] = useState("");

	useEffect(() => {
		setDraft(scene);
	}, [scene]);

	const prevScene = useMemo(() => {
		const list = store.scenesOf(scene.projectId);
		const i = list.findIndex((s) => s.id === scene.id);
		return i > 0 ? list[i - 1] : null;
	}, [scene, store]);

	function commit(patch: Partial<Scene>) {
		const next = { ...draft, ...patch };
		setDraft(next);
		store.updateScene(scene.id, patch);
	}

	return (
		<div className="card stack" style={{ gap: 14 }}>
			<div className="row row--between row--wrap" style={{ gap: 8 }}>
				<div className="row" style={{ gap: 8 }}>
					<span className="badge badge--violet">Scene {scene.number}</span>
					<span className={`badge badge--${statusTone(scene.status)}`}>{scene.status}</span>
				</div>
				<div className="row" style={{ gap: 6 }}>
					<Button size="sm" variant="ghost" disabled={!hasPrev} onClick={onPrev}>
						Previous
					</Button>
					<Button size="sm" variant="ghost" disabled={!hasNext} onClick={onNext}>
						Next
					</Button>
				</div>
			</div>

			<Field label="Scene title">
				{(id) => (
					<TextInput
						id={id}
						value={draft.title}
						onChange={(e) => commit({ title: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Story purpose">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.purpose}
						onChange={(e) => commit({ purpose: e.target.value })}
					/>
				)}
			</Field>
			<div className="grid grid--2">
				<Field label="Location">
					{(id) => (
						<TextInput
							id={id}
							value={draft.location}
							onChange={(e) => commit({ location: e.target.value })}
						/>
					)}
				</Field>
				<Field label="Time of day">
					{(id) => (
						<TextInput
							id={id}
							value={draft.timeOfDay}
							onChange={(e) => commit({ timeOfDay: e.target.value })}
							placeholder="dawn"
						/>
					)}
				</Field>
			</div>
			<Field label="Atmosphere">
				{(id) => (
					<TextInput
						id={id}
						value={draft.atmosphere}
						onChange={(e) => commit({ atmosphere: e.target.value })}
						placeholder="calm, hazy, tense"
					/>
				)}
			</Field>

			<div className="stack" style={{ gap: 8 }}>
				<span className="field__label">Characters in this scene</span>
				<div className="chips">
					{characters.length === 0 && (
						<span className="tiny faint">No characters in this project yet.</span>
					)}
					{characters.map((c) => {
						const active = draft.characterIds.includes(c.id);
						return (
							<button
								key={c.id}
								type="button"
								className={`chip ${active ? "chip--active" : ""}`}
								aria-pressed={active}
								onClick={() =>
									commit({
										characterIds: active
											? draft.characterIds.filter((x) => x !== c.id)
											: [...draft.characterIds, c.id],
									})
								}
							>
								{c.name}
							</button>
						);
					})}
				</div>
			</div>

			<Field label="Action">
				{(id) => (
					<TextArea
						id={id}
						rows={3}
						value={draft.action}
						onChange={(e) => commit({ action: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Camera direction">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.camera}
						onChange={(e) => commit({ camera: e.target.value })}
						placeholder="slow dolly in, low angle"
					/>
				)}
			</Field>
			<Field label="Image prompt">
				{(id) => (
					<TextArea
						id={id}
						rows={3}
						value={draft.imagePrompt}
						onChange={(e) => commit({ imagePrompt: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Video prompt">
				{(id) => (
					<TextArea
						id={id}
						rows={3}
						value={draft.videoPrompt}
						onChange={(e) => commit({ videoPrompt: e.target.value })}
					/>
				)}
			</Field>
			<Field label="Narration">
				{(id) => (
					<TextArea
						id={id}
						rows={3}
						value={draft.narration}
						onChange={(e) => commit({ narration: e.target.value })}
					/>
				)}
			</Field>

			<div className="stack" style={{ gap: 8 }}>
				<span className="field__label">Dialogue</span>
				{draft.dialogue.length === 0 && (
					<span className="tiny faint">No dialogue lines in this scene.</span>
				)}
				{draft.dialogue.map((line) => (
					<div key={line.id} className="row row--between" style={{ gap: 8 }}>
						<span className="small">
							<strong>{line.speaker || "Narrator"}</strong>: {line.text}
						</span>
						<button
							type="button"
							className="btn btn--ghost btn--sm"
							onClick={() =>
								commit({
									dialogue: draft.dialogue.filter((l) => l.id !== line.id),
								})
							}
						>
							Remove
						</button>
					</div>
				))}
				<div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
					<div style={{ flex: 1, minWidth: 0 }}>
						<Field label="Speaker">
							{(id) => (
								<TextInput
									id={id}
									value={speaker}
									onChange={(e) => setSpeaker(e.target.value)}
									placeholder="Character name"
								/>
							)}
						</Field>
					</div>
					<div style={{ flex: 2, minWidth: 0 }}>
						<Field label="Line">
							{(id) => (
								<TextInput
									id={id}
									value={lineText}
									onChange={(e) => setLineText(e.target.value)}
									placeholder="What they say"
								/>
							)}
						</Field>
					</div>
				</div>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => {
						if (!lineText.trim()) return;
						commit({
							dialogue: [
								...draft.dialogue,
								{
									id: `dlg_${Date.now().toString(36)}`,
									speaker: speaker.trim(),
									text: lineText.trim(),
								},
							],
						});
						setSpeaker("");
						setLineText("");
					}}
				>
					Add dialogue line
				</Button>
			</div>

			<div className="grid grid--2">
				<Field label="Estimated duration (seconds)">
					{(id) => (
						<TextInput
							id={id}
							type="number"
							min={1}
							value={draft.durationSec}
							onChange={(e) =>
								commit({ durationSec: Math.max(1, Number(e.target.value) || 1) })
							}
						/>
					)}
				</Field>
				<Field label="Aspect ratio">
					{(id) => (
						<Select
							id={id}
							value={draft.aspectRatio}
							onChange={(e) =>
								commit({ aspectRatio: e.target.value as Scene["aspectRatio"] })
							}
						>
							{ASPECT_RATIOS.map((a) => (
								<option key={a} value={a}>
									{a}
								</option>
							))}
						</Select>
					)}
				</Field>
			</div>
			<Field label="Visual style">
				{() => (
					<Chips
						options={VISUAL_STYLES.map((v) => ({ value: v, label: v }))}
						value={draft.visualStyle}
						onChange={(v) => commit({ visualStyle: v })}
					/>
				)}
			</Field>
			<Field label="Voice notes">
				{(id) => (
					<TextInput
						id={id}
						value={draft.voiceNotes}
						onChange={(e) => commit({ voiceNotes: e.target.value })}
						placeholder="calm female narrator"
					/>
				)}
			</Field>
			<Field label="Sound notes">
				{(id) => (
					<TextInput
						id={id}
						value={draft.soundNotes}
						onChange={(e) => commit({ soundNotes: e.target.value })}
						placeholder="river ambience"
					/>
				)}
			</Field>
			<Field label="Continuity notes" hint="What must stay the same as the previous scene?">
				{(id) => (
					<TextArea
						id={id}
						rows={2}
						value={draft.continuityNotes}
						onChange={(e) => commit({ continuityNotes: e.target.value })}
					/>
				)}
			</Field>

			{prevScene && (
				<div className="banner banner--ok">
					<strong>Previous scene ({prevScene.number}) — {prevScene.title}</strong>
					<p className="small" style={{ margin: "4px 0 0" }}>
						{prevScene.continuityNotes ||
							prevScene.narration ||
							"No continuity notes recorded for the previous scene."}
					</p>
				</div>
			)}

			{scene.errorMessage && <div className="banner banner--err">{scene.errorMessage}</div>}
			{scene.statusMessage && <div className="banner banner--ok">{scene.statusMessage}</div>}

			<div className="btn-row">
				<Button size="sm" variant="ghost" onClick={() => onMove(-1)} icon={<IconArrowUp size={15} />}>
					Move up
				</Button>
				<Button size="sm" variant="ghost" onClick={() => onMove(1)} icon={<IconArrowDown size={15} />}>
					Move down
				</Button>
				<Button size="sm" variant="ghost" onClick={onDuplicate} icon={<IconCopy size={15} />}>
					Duplicate
				</Button>
				<Button size="sm" variant="danger" onClick={onDelete} icon={<IconTrash size={15} />}>
					Delete
				</Button>
			</div>

			<div className="row row--wrap" style={{ gap: 8 }}>
				<Button
					size="sm"
					onClick={() => {
						commit({ approved: !draft.approved });
						toast(draft.approved ? "Scene unapproved" : "Scene approved", "ok");
					}}
				>
					{draft.approved ? "Unapprove scene" : "Approve scene"}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => {
						const text = [
							draft.title,
							draft.purpose,
							draft.action,
							draft.camera,
							draft.imagePrompt,
							draft.narration,
						]
							.filter(Boolean)
							.join("\n");
						downloadText(text, `${draft.title.replace(/\s+/g, "-").toLowerCase()}.txt`);
					}}
					icon={<IconDownload size={15} />}
				>
					Export scene notes
				</Button>
				<Button size="sm" variant="ghost" onClick={() => setDialogOpen(true)}>
					Prompt for external engine
				</Button>
			</div>

			<Modal open={dialogOpen} title="Scene prompt" onClose={() => setDialogOpen(false)}>
				<TextArea
					rows={10}
					readOnly
					value={[
						`Scene ${draft.number}: ${draft.title}`,
						`Aspect: ${draft.aspectRatio} | Style: ${draft.visualStyle || "not set"}`,
						`Duration target: ${draft.durationSec}s`,
						draft.purpose ? `Purpose: ${draft.purpose}` : "",
						draft.location ? `Location: ${draft.location}, ${draft.timeOfDay}` : "",
						draft.action ? `Action: ${draft.action}` : "",
						draft.camera ? `Camera: ${draft.camera}` : "",
						draft.imagePrompt ? `Image prompt: ${draft.imagePrompt}` : "",
						draft.videoPrompt ? `Video prompt: ${draft.videoPrompt}` : "",
						draft.narration ? `Narration: ${draft.narration}` : "",
						...draft.dialogue.map((l) => `${l.speaker}: ${l.text}`),
					]
						.filter(Boolean)
						.join("\n")}
				/>
				<Button
					size="sm"
					onClick={() => {
						navigator.clipboard
							?.writeText(
								[
									draft.imagePrompt,
									draft.videoPrompt,
									draft.action,
									draft.camera,
								]
									.filter(Boolean)
									.join("\n"),
							)
							.then(() => toast("Prompt copied", "ok"))
							.catch(() => toast("Clipboard unavailable", "err"));
					}}
				>
					Copy image + video prompt
				</Button>
			</Modal>
		</div>
	);
}
