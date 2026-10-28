import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type {
	AppSettings,
	Character,
	MediaItem,
	Project,
	Scene,
	ScriptData,
} from "./types";
import {
	defaultSettings,
	emptyState,
	loadSettings,
	loadState,
	saveSettings,
	saveState,
	type PersistedState,
} from "./storage";

export function uid(prefix = "id"): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface StoreValue {
	state: PersistedState;
	settings: AppSettings;
	projects: Project[];
	scenes: Scene[];
	characters: Character[];
	media: MediaItem[];
	scripts: Record<string, ScriptData>;

	updateSettings: (patch: Partial<AppSettings>) => void;

	createProject: (input: Partial<Project>) => Project;
	updateProject: (id: string, patch: Partial<Project>) => void;
	duplicateProject: (id: string) => Project | null;
	archiveProject: (id: string, archived: boolean) => void;
	deleteProject: (id: string) => void;

	createScene: (projectId: string, input?: Partial<Scene>) => Scene | null;
	updateScene: (id: string, patch: Partial<Scene>) => void;
	deleteScene: (id: string) => void;
	duplicateScene: (id: string) => Scene | null;
	moveScene: (projectId: string, sceneId: string, direction: -1 | 1) => void;

	createCharacter: (projectId: string, input?: Partial<Character>) => Character | null;
	updateCharacter: (id: string, patch: Partial<Character>) => void;
	deleteCharacter: (id: string) => void;
	duplicateCharacter: (id: string) => Character | null;

	addMedia: (item: MediaItem) => void;
	updateMedia: (id: string, patch: Partial<MediaItem>) => void;
	deleteMedia: (id: string) => void;

	setScript: (projectId: string, script: ScriptData) => void;

	importBackup: (data: Partial<PersistedState>) => void;
	resetAll: () => void;

	logActivity: (projectId: string, kind: Project["activity"][number]["kind"], label: string) => void;

	getProject: (id: string | undefined) => Project | undefined;
	getScene: (id: string | undefined) => Scene | undefined;
	scenesOf: (projectId: string | undefined) => Scene[];
	charactersOf: (projectId: string | undefined) => Character[];
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<PersistedState>(() => loadState());
	const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
	const firstRender = useRef(true);

	useEffect(() => {
		if (firstRender.current) {
			firstRender.current = false;
			return;
		}
		saveState(state);
	}, [state]);

	useEffect(() => {
		saveSettings(settings);
		const root = document.documentElement;
		root.dataset.theme = settings.theme;
		root.dataset.motion = settings.reduceMotion ? "reduced" : "full";
	}, [settings]);

	const updateSettings = useCallback((patch: Partial<AppSettings>) => {
		setSettings((prev) => ({ ...prev, ...patch }));
	}, []);

	const mutate = useCallback((fn: (prev: PersistedState) => PersistedState) => {
		setState((prev) => fn(prev));
	}, []);

	const createProject = useCallback(
		(input: Partial<Project>) => {
			const now = Date.now();
			const project: Project = {
				id: uid("prj"),
				title: "Untitled Film",
				description: "",
				filmType: "storytelling",
				premise: "",
				tone: "",
				genre: "",
				settings: {
					aspectRatio: settings.defaultAspectRatio,
					platform: "youtube-long",
					language: settings.defaultLanguage,
					audience: "",
					narrationStyle: "",
					visualStyle: "",
					targetDurationSec: 60,
				},
				status: "draft",
				createdAt: now,
				updatedAt: now,
				archived: false,
				sceneIds: [],
				characterIds: [],
				activity: [],
				...input,
			};
			mutate((prev) => ({ ...prev, projects: [project, ...prev.projects] }));
			return project;
		},
		[mutate, settings.defaultAspectRatio, settings.defaultLanguage],
	);

	const updateProject = useCallback(
		(id: string, patch: Partial<Project>) => {
			mutate((prev) => ({
				...prev,
				projects: prev.projects.map((p) =>
					p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
				),
			}));
		},
		[mutate],
	);

	const duplicateProject = useCallback(
		(id: string) => {
			let copy: Project | null = null;
			mutate((prev) => {
				const source = prev.projects.find((p) => p.id === id);
				if (!source) return prev;
				const now = Date.now();
				const sceneIdMap = new Map<string, string>();
				const scenes = source.sceneIds
					.map((sid) => prev.scenes.find((s) => s.id === sid))
					.filter((s): s is Scene => Boolean(s))
					.map((s) => {
						const nid = uid("scn");
						sceneIdMap.set(s.id, nid);
						return { ...s, id: nid, projectId: "", number: s.number, createdAt: now, updatedAt: now };
					});
				const characters = source.characterIds
					.map((cid) => prev.characters.find((c) => c.id === cid))
					.filter((c): c is Character => Boolean(c))
					.map((c) => ({ ...c, id: uid("chr"), name: `${c.name} (copy)` }));
				const newProjectId = uid("prj");
				copy = {
					...source,
					id: newProjectId,
					title: `${source.title} (copy)`,
					createdAt: now,
					updatedAt: now,
					status: "draft",
					archived: false,
					sceneIds: scenes.map((s) => s.id),
					characterIds: characters.map((c) => c.id),
					activity: [],
				};
				const mappedScenes = scenes.map((s) => ({ ...s, projectId: newProjectId }));
				const mappedCharacters = characters.map((c) => ({ ...c, projectId: newProjectId }));
				return {
					...prev,
					projects: [copy, ...prev.projects],
					scenes: [...mappedScenes, ...prev.scenes],
					characters: [...mappedCharacters, ...prev.characters],
					scripts: { ...prev.scripts, [newProjectId]: prev.scripts[source.id] ?? emptyScript() },
				};
			});
			return copy;
		},
		[mutate],
	);

	const archiveProject = useCallback(
		(id: string, archived: boolean) => {
			mutate((prev) => ({
				...prev,
				projects: prev.projects.map((p) =>
					p.id === id
						? { ...p, archived, status: archived ? "archived" : "draft", updatedAt: Date.now() }
						: p,
				),
			}));
		},
		[mutate],
	);

	const deleteProject = useCallback(
		(id: string) => {
			mutate((prev) => {
				const sceneIds = new Set(
					prev.projects.find((p) => p.id === id)?.sceneIds ?? [],
				);
				const characterIds = new Set(
					prev.projects.find((p) => p.id === id)?.characterIds ?? [],
				);
				const scripts = { ...prev.scripts };
				delete scripts[id];
				return {
					...prev,
					projects: prev.projects.filter((p) => p.id !== id),
					scenes: prev.scenes.filter((s) => !sceneIds.has(s.id)),
					characters: prev.characters.filter((c) => !characterIds.has(c.id)),
					scripts,
				};
			});
		},
		[mutate],
	);

	const createScene = useCallback(
		(projectId: string, input?: Partial<Scene>) => {
			const now = Date.now();
			let created: Scene | null = null;
			mutate((prev) => {
				const project = prev.projects.find((p) => p.id === projectId);
				if (!project) return prev;
				const existing = prev.scenes.filter((s) => s.projectId === projectId);
				const nextNumber = existing.length
					? Math.max(...existing.map((s) => s.number)) + 1
					: 1;
				const scene: Scene = {
					id: uid("scn"),
					projectId,
					number: nextNumber,
					title: `Scene ${nextNumber}`,
					purpose: "",
					location: "",
					timeOfDay: "",
					atmosphere: "",
					characterIds: [],
					action: "",
					camera: "",
					imagePrompt: "",
					videoPrompt: "",
					narration: "",
					dialogue: [],
					durationSec: 8,
					aspectRatio: project.settings.aspectRatio,
					visualStyle: project.settings.visualStyle,
					referenceImageIds: [],
					voiceNotes: "",
					soundNotes: "",
					status: "draft",
					audioMediaIds: [],
					continuityNotes: "",
					approved: false,
					createdAt: now,
					updatedAt: now,
					...input,
				};
				created = scene;
				return {
					...prev,
					scenes: [...prev.scenes, scene],
					projects: prev.projects.map((p) =>
						p.id === projectId
							? { ...p, sceneIds: [...p.sceneIds, scene.id], updatedAt: now }
							: p,
					),
				};
			});
			return created;
		},
		[mutate],
	);

	const updateScene = useCallback(
		(id: string, patch: Partial<Scene>) => {
			mutate((prev) => ({
				...prev,
				scenes: prev.scenes.map((s) =>
					s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
				),
			}));
		},
		[mutate],
	);

	const deleteScene = useCallback(
		(id: string) => {
			mutate((prev) => {
				const scene = prev.scenes.find((s) => s.id === id);
				if (!scene) return prev;
				return {
					...prev,
					scenes: prev.scenes.filter((s) => s.id !== id),
					projects: prev.projects.map((p) =>
						p.id === scene.projectId
							? { ...p, sceneIds: p.sceneIds.filter((sid) => sid !== id) }
							: p,
					),
				};
			});
		},
		[mutate],
	);

	const duplicateScene = useCallback(
		(id: string) => {
			let copy: Scene | null = null;
			mutate((prev) => {
				const scene = prev.scenes.find((s) => s.id === id);
				if (!scene) return prev;
				const now = Date.now();
				const newId = uid("scn");
				const sameProject = prev.scenes.filter((s) => s.projectId === scene.projectId);
				const nextNumber = sameProject.length
					? Math.max(...sameProject.map((s) => s.number)) + 1
					: 1;
				copy = {
					...scene,
					id: newId,
					number: nextNumber,
					title: `${scene.title} (copy)`,
					approved: false,
					status: "draft",
					createdAt: now,
					updatedAt: now,
				};
				const project = prev.projects.find((p) => p.id === scene.projectId);
				const insertAt = project ? project.sceneIds.indexOf(scene.id) + 1 : -1;
				const sceneIds = [...(project?.sceneIds ?? [])];
				sceneIds.splice(insertAt, 0, newId);
				return {
					...prev,
					scenes: [...prev.scenes, copy],
					projects: prev.projects.map((p) =>
						p.id === scene.projectId ? { ...p, sceneIds, updatedAt: now } : p,
					),
				};
			});
			return copy;
		},
		[mutate],
	);

	const moveScene = useCallback(
		(projectId: string, sceneId: string, direction: -1 | 1) => {
			mutate((prev) => {
				const project = prev.projects.find((p) => p.id === projectId);
				if (!project) return prev;
				const ids = [...project.sceneIds];
				const index = ids.indexOf(sceneId);
				const target = index + direction;
				if (index < 0 || target < 0 || target >= ids.length) return prev;
				[ids[index], ids[target]] = [ids[target], ids[index]];
				return {
					...prev,
					projects: prev.projects.map((p) =>
						p.id === projectId ? { ...p, sceneIds: ids, updatedAt: Date.now() } : p,
					),
				};
			});
		},
		[mutate],
	);

	const createCharacter = useCallback(
		(projectId: string, input?: Partial<Character>) => {
			const now = Date.now();
			let created: Character | null = null;
			mutate((prev) => {
				const character: Character = {
					id: uid("chr"),
					projectId,
					name: "New Character",
					ageRange: "",
					role: "",
					personality: "",
					clothing: "",
					appearance: "",
					voice: "",
					background: "",
					continuityNotes: "",
					prompt: "",
					referenceImageIds: [],
					archived: false,
					createdAt: now,
					updatedAt: now,
					...input,
				};
				created = character;
				return {
					...prev,
					characters: [...prev.characters, character],
					projects: prev.projects.map((p) =>
						p.id === projectId
							? { ...p, characterIds: [...p.characterIds, character.id], updatedAt: now }
							: p,
					),
				};
			});
			return created;
		},
		[mutate],
	);

	const updateCharacter = useCallback(
		(id: string, patch: Partial<Character>) => {
			mutate((prev) => ({
				...prev,
				characters: prev.characters.map((c) =>
					c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
				),
			}));
		},
		[mutate],
	);

	const deleteCharacter = useCallback(
		(id: string) => {
			mutate((prev) => ({
				...prev,
				characters: prev.characters.filter((c) => c.id !== id),
				projects: prev.projects.map((p) =>
					p.id
						? { ...p, characterIds: p.characterIds.filter((cid) => cid !== id) }
						: p,
				),
				scenes: prev.scenes.map((s) =>
					s.characterIds.includes(id)
						? { ...s, characterIds: s.characterIds.filter((cid) => cid !== id) }
						: s,
				),
			}));
		},
		[mutate],
	);

	const duplicateCharacter = useCallback(
		(id: string) => {
			let copy: Character | null = null;
			mutate((prev) => {
				const c = prev.characters.find((x) => x.id === id);
				if (!c) return prev;
				const now = Date.now();
				const newId = uid("chr");
				copy = { ...c, id: newId, name: `${c.name} (copy)`, createdAt: now, updatedAt: now };
				return {
					...prev,
					characters: [...prev.characters, copy],
					projects: prev.projects.map((p) =>
						p.id === c.projectId
							? { ...p, characterIds: [...p.characterIds, newId], updatedAt: now }
							: p,
					),
				};
			});
			return copy;
		},
		[mutate],
	);

	const addMedia = useCallback(
		(item: MediaItem) => {
			mutate((prev) => ({ ...prev, media: [item, ...prev.media] }));
		},
		[mutate],
	);

	const updateMedia = useCallback(
		(id: string, patch: Partial<MediaItem>) => {
			mutate((prev) => ({
				...prev,
				media: prev.media.map((m) => (m.id === id ? { ...m, ...patch } : m)),
			}));
		},
		[mutate],
	);

	const deleteMedia = useCallback(
		(id: string) => {
			mutate((prev) => ({ ...prev, media: prev.media.filter((m) => m.id !== id) }));
		},
		[mutate],
	);

	const setScript = useCallback(
		(projectId: string, script: ScriptData) => {
			mutate((prev) => ({
				...prev,
				scripts: { ...prev.scripts, [projectId]: { ...script, updatedAt: Date.now() } },
			}));
		},
		[mutate],
	);

	const logActivity = useCallback(
		(projectId: string, kind: Project["activity"][number]["kind"], label: string) => {
			mutate((prev) => ({
				...prev,
				projects: prev.projects.map((p) =>
					p.id === projectId
						? {
								...p,
								updatedAt: Date.now(),
								activity: [{ id: uid("act"), at: Date.now(), kind, label }, ...p.activity].slice(0, 60),
							}
						: p,
				),
			}));
		},
		[mutate],
	);

	const getProject = useCallback(
		(id: string | undefined) => state.projects.find((p) => p.id === id),
		[state.projects],
	);
	const getScene = useCallback(
		(id: string | undefined) => state.scenes.find((s) => s.id === id),
		[state.scenes],
	);
	const scenesOf = useCallback(
		(projectId: string | undefined) => {
			if (!projectId) return [];
			const project = state.projects.find((p) => p.id === projectId);
			if (!project) return [];
			return project.sceneIds
				.map((sid) => state.scenes.find((s) => s.id === sid))
				.filter((s): s is Scene => Boolean(s));
		},
		[state.projects, state.scenes],
	);
	const charactersOf = useCallback(
		(projectId: string | undefined) => {
			if (!projectId) return [];
			const project = state.projects.find((p) => p.id === projectId);
			if (!project) return [];
			return project.characterIds
				.map((cid) => state.characters.find((c) => c.id === cid))
				.filter((c): c is Character => Boolean(c));
		},
		[state.projects, state.characters],
	);

	const value = useMemo<StoreValue>(
		() => ({
			state,
			settings,
			projects: state.projects,
			scenes: state.scenes,
			characters: state.characters,
			media: state.media,
			scripts: state.scripts,
			updateSettings,
			createProject,
			updateProject,
			duplicateProject,
			archiveProject,
			deleteProject,
			createScene,
			updateScene,
			deleteScene,
			duplicateScene,
			moveScene,
			createCharacter,
			updateCharacter,
			deleteCharacter,
			duplicateCharacter,
			addMedia,
			updateMedia,
			deleteMedia,
			setScript,
			logActivity,
			getProject,
			getScene,
			scenesOf,
			charactersOf,
		}),
		[
			state,
			settings,
			updateSettings,
			createProject,
			updateProject,
			duplicateProject,
			archiveProject,
			deleteProject,
			createScene,
			updateScene,
			deleteScene,
			duplicateScene,
			moveScene,
			createCharacter,
			updateCharacter,
			deleteCharacter,
			duplicateCharacter,
			addMedia,
			updateMedia,
			deleteMedia,
			setScript,
			logActivity,
			getProject,
			getScene,
			scenesOf,
			charactersOf,
		],
	);

	return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
	const ctx = useContext(StoreContext);
	if (!ctx) throw new Error("useStore must be used inside StoreProvider");
	return ctx;
}

export function emptyScript(): ScriptData {
	return {
		premise: "",
		audience: "",
		genre: "",
		tone: "",
		targetDurationSec: 60,
		chapters: [],
		updatedAt: Date.now(),
	};
}

export { defaultSettings, emptyState };
