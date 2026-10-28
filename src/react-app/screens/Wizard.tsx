import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { navigateTo } from "../lib/router";
import {
	Button,
	Chips,
	Field,
	Select,
	Stepper,
	TextArea,
	TextInput,
	useToast,
} from "../components/ui";
import {
	ASPECT_RATIOS,
	FILM_TYPES,
	LANGUAGES,
	NARRATION_STYLES,
	PLATFORMS,
	VISUAL_STYLES,
} from "../lib/scriptTools";
import type { AspectRatio, FilmType, TargetPlatform } from "../lib/types";

const STEPS = [
	"Title",
	"Film type",
	"Platform",
	"Aspect ratio",
	"Duration",
	"Language & style",
	"Characters",
	"Script",
	"Scenes",
];

const DURATION_PRESETS = [
	{ label: "Short clip (15–30s)", sec: 30 },
	{ label: "Shorts / Reels (45–60s)", sec: 60 },
	{ label: "1–2 minutes", sec: 120 },
	{ label: "5 minutes", sec: 300 },
	{ label: "10 minutes", sec: 600 },
	{ label: "Long-form (20+ min)", sec: 1500 },
];

export default function Wizard() {
	const { createProject, createCharacter, createScene, setScript, updateProject } = useStore();
	const toast = useToast();
	const [step, setStep] = useState(0);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [filmType, setFilmType] = useState<FilmType>("storytelling");
	const [platform, setPlatform] = useState<TargetPlatform>("youtube-long");
	const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
	const [duration, setDuration] = useState(60);
	const [language, setLanguage] = useState("English");
	const [audience, setAudience] = useState("");
	const [narrationStyle, setNarrationStyle] = useState(NARRATION_STYLES[0]);
	const [visualStyle, setVisualStyle] = useState(VISUAL_STYLES[0]);
	const [characters, setCharacters] = useState<{ name: string; role: string }[]>([]);
	const [charName, setCharName] = useState("");
	const [charRole, setCharRole] = useState("");
	const [scriptText, setScriptText] = useState("");
	const [sceneTitles, setSceneTitles] = useState("");
	const [projectId, setProjectId] = useState<string | null>(null);

	const canNext = useMemo(() => {
		if (step === 0) return title.trim().length > 0;
		return true;
	}, [step, title]);

	function ensureProject() {
		if (projectId) return projectId;
		const p = createProject({
			title: title.trim() || "Untitled Film",
			description: description.trim(),
			filmType,
			premise: description.trim(),
			settings: {
				aspectRatio,
				platform,
				language,
				audience: audience.trim(),
				narrationStyle,
				visualStyle,
				targetDurationSec: duration,
			},
			status: "draft",
		});
		setProjectId(p.id);
		return p.id;
	}

	function finish() {
		const id = ensureProject();
		// Characters
		for (const c of characters) {
			createCharacter(id, { name: c.name, role: c.role });
		}
		// Script
		setScript(id, {
			premise: description.trim(),
			audience: audience.trim(),
			genre: FILM_TYPES.find((f) => f.id === filmType)?.label ?? "",
			tone: narrationStyle,
			targetDurationSec: duration,
			chapters: [],
			updatedAt: Date.now(),
		});
		// Scenes
		const lines = sceneTitles
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);
		const titles = lines.length ? lines : ["Scene 1", "Scene 2", "Scene 3"];
		titles.forEach((t, i) => {
			createScene(id, {
				title: t,
				number: i + 1,
				durationSec: Math.max(3, Math.round(duration / titles.length)),
				aspectRatio,
				visualStyle,
			});
		});
		updateProject(id, { status: "in-progress" });
		toast("Project created", "ok");
		navigateTo(`/project/${id}`);
	}

	return (
		<div className="stack" style={{ gap: 18 }}>
			<div className="stack" style={{ gap: 8 }}>
				<Stepper total={STEPS.length} current={step} labels={STEPS} />
				<p className="tiny faint">
					Step {step + 1} of {STEPS.length} · {STEPS[step]}
				</p>
			</div>

			<div className="card stack" style={{ gap: 16 }}>
				{step === 0 && (
					<>
						<h2 className="card__title">What are we making?</h2>
						<Field label="Project title" hint="You can rename it later.">
							{(id) => (
								<TextInput
									id={id}
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="e.g. The Water Gardens of Alexandria"
									autoFocus
								/>
							)}
						</Field>
						<Field label="Description / premise">
							{(id) => (
								<TextArea
									id={id}
									rows={4}
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="One or two sentences about the film."
								/>
							)}
						</Field>
					</>
				)}

				{step === 1 && (
					<>
						<h2 className="card__title">Film type</h2>
						<Field label="Choose a type">
							{() => (
								<Chips
									options={FILM_TYPES.map((f) => ({ value: f.id, label: f.label }))}
									value={filmType}
									onChange={(v) => setFilmType(v as FilmType)}
								/>
							)}
						</Field>
						<p className="tiny faint">
							This sets the starting structure only. Everything remains editable.
						</p>
					</>
				)}

				{step === 2 && (
					<>
						<h2 className="card__title">Target platform</h2>
						<Field label="Where will the film be published?">
							{() => (
								<Chips
									options={PLATFORMS.map((p) => ({ value: p.id, label: p.label }))}
									value={platform}
									onChange={(v) => setPlatform(v as TargetPlatform)}
								/>
							)}
						</Field>
						<p className="tiny faint">
							{PLATFORMS.find((p) => p.id === platform)?.hint}
						</p>
					</>
				)}

				{step === 3 && (
					<>
						<h2 className="card__title">Aspect ratio</h2>
						<Field label="Frame format">
							{() => (
								<Chips
									options={ASPECT_RATIOS.map((a) => ({ value: a, label: a }))}
									value={aspectRatio}
									onChange={(v) => setAspectRatio(v as AspectRatio)}
								/>
							)}
						</Field>
						<p className="tiny faint">
							9:16 is vertical (Shorts, Reels), 16:9 is widescreen (YouTube), 1:1 is square,
							4:5 is portrait feed.
						</p>
					</>
				)}

				{step === 4 && (
					<>
						<h2 className="card__title">Target duration</h2>
						<Field label="How long should the finished film be?">
							{() => (
								<Chips
									options={DURATION_PRESETS.map((d) => ({
										value: String(d.sec),
										label: d.label,
									}))}
									value={String(duration)}
									onChange={(v) => setDuration(Number(v))}
								/>
							)}
						</Field>
						<Field label="Exact target (seconds)">
							{(id) => (
								<TextInput
									id={id}
									type="number"
									min={5}
									max={3600}
									value={duration}
									onChange={(e) => setDuration(Math.max(5, Number(e.target.value) || 5))}
								/>
							)}
						</Field>
						<p className="tiny faint">
							This is a target only. The real length depends on the generation engine,
							clip limits, processing time and storage. Long films are assembled from
							several short clips.
						</p>
					</>
				)}

				{step === 5 && (
					<>
						<h2 className="card__title">Language, audience and style</h2>
						<Field label="Film language">
							{(id) => (
								<Select
									id={id}
									value={language}
									onChange={(e) => setLanguage(e.target.value)}
								>
									{LANGUAGES.map((l) => (
										<option key={l} value={l}>
											{l}
										</option>
									))}
								</Select>
							)}
						</Field>
						<Field label="Target audience">
							{(id) => (
								<TextInput
									id={id}
									value={audience}
									onChange={(e) => setAudience(e.target.value)}
									placeholder="e.g. curious general viewers"
								/>
							)}
						</Field>
						<Field label="Narration style">
							{() => (
								<Chips
									options={NARRATION_STYLES.map((s) => ({ value: s, label: s }))}
									value={narrationStyle}
									onChange={setNarrationStyle}
								/>
							)}
						</Field>
						<Field label="Visual style">
							{() => (
								<Chips
									options={VISUAL_STYLES.map((s) => ({ value: s, label: s }))}
									value={visualStyle}
									onChange={setVisualStyle}
								/>
							)}
						</Field>
					</>
				)}

				{step === 6 && (
					<>
						<h2 className="card__title">Characters</h2>
						<p className="tiny faint">
							Add the characters you need. You can add reference images, full
							descriptions and scene assignments later in the Character Bible.
						</p>
						<div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
							<div style={{ flex: 1, minWidth: 0 }}>
								<Field label="Name">
									{(id) => (
										<TextInput
											id={id}
											value={charName}
											onChange={(e) => setCharName(e.target.value)}
											placeholder="Character name"
										/>
									)}
								</Field>
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<Field label="Role">
									{(id) => (
										<TextInput
											id={id}
											value={charRole}
											onChange={(e) => setCharRole(e.target.value)}
											placeholder="Protagonist"
										/>
									)}
								</Field>
							</div>
						</div>
						<Button
							variant="ghost"
							onClick={() => {
								if (!charName.trim()) return;
								setCharacters((prev) => [
									...prev,
									{ name: charName.trim(), role: charRole.trim() },
								]);
								setCharName("");
								setCharRole("");
							}}
						>
							Add character
						</Button>
						{characters.length > 0 && (
							<ul className="list-reset stack" style={{ gap: 6 }}>
								{characters.map((c, i) => (
									<li key={`${c.name}-${i}`} className="row row--between">
										<span className="small">
											{c.name} {c.role && <span className="faint">· {c.role}</span>}
										</span>
										<button
											type="button"
											className="btn btn--ghost btn--sm"
											onClick={() =>
												setCharacters((prev) => prev.filter((_, idx) => idx !== i))
											}
										>
											Remove
										</button>
									</li>
								))}
							</ul>
						)}
					</>
				)}

				{step === 7 && (
					<>
						<h2 className="card__title">Script</h2>
						<p className="tiny faint">
							Paste your script, or leave it blank and let the AI Script Writer help
							you later. You can also import a file in the Script Writer.
						</p>
						<Field label="Script text (optional)">
							{(id) => (
								<TextArea
									id={id}
									rows={8}
									value={scriptText}
									onChange={(e) => setScriptText(e.target.value)}
									placeholder={"SCENE 1\nNarrator text...\n\nSCENE 2\n..."}
								/>
							)}
						</Field>
					</>
				)}

				{step === 8 && (
					<>
						<h2 className="card__title">Scene plan</h2>
						<p className="tiny faint">
							List one scene per line. Leave blank to start with three placeholder
							scenes you can rename.
						</p>
						<Field label="Scenes">
							{(id) => (
								<TextArea
									id={id}
									rows={8}
									value={sceneTitles}
									onChange={(e) => setSceneTitles(e.target.value)}
									placeholder={"Opening — the river at dawn\nThe hidden garden\nThe reveal"}
								/>
							)}
						</Field>
					</>
				)}
			</div>

			<div className="btn-row">
				<Button
					variant="ghost"
					block
					disabled={step === 0}
					onClick={() => setStep((s) => Math.max(0, s - 1))}
				>
					Back
				</Button>
				{step < STEPS.length - 1 ? (
					<Button
						block
						disabled={!canNext}
						onClick={() => {
							if (step >= 6 && !projectId) ensureProject();
							setStep((s) => s + 1);
						}}
					>
						Continue
					</Button>
				) : (
					<Button block onClick={finish}>
						Create project
					</Button>
				)}
			</div>

			<p className="tiny faint">
				Drafts are saved to this device as you go. Nothing is sent to an AI service
				unless you connect one and allow external uploads.
			</p>
		</div>
	);
}
