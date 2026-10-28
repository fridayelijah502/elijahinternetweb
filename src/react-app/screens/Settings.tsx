import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import {
	Banner,
	Button,
	Checkbox,
	ConfirmDialog,
	EmptyState,
	Field,
	SectionHead,
	Select,
	TextInput,
	formatBytes,
	useToast,
} from "../components/ui";
import { IconDownload, IconRefresh, IconUpload } from "../components/icons";
import { ASPECT_RATIOS, LANGUAGES } from "../lib/scriptTools";
import { fetchProviders, ProviderError } from "../lib/providers";
import { downloadText } from "../lib/media";
import { storageEstimate } from "../lib/storage";
import type { ProviderInfo } from "../lib/types";

export default function SettingsScreen() {
	const store = useStore();
	const toast = useToast();
	const { settings, updateSettings } = store;
	const [providers, setProviders] = useState<ProviderInfo[]>([]);
	const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
	const [providerError, setProviderError] = useState<string | null>(null);
	const [testing, setTesting] = useState(false);
	const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
	const [resetOpen, setResetOpen] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);

	async function loadProviders() {
		setTesting(true);
		setProviderError(null);
		try {
			const res = await fetchProviders();
			setProviders(res.providers);
			setServerConfigured(res.serverConfigured);
		} catch (err) {
			setProviders([]);
			setServerConfigured(false);
			setProviderError(
				err instanceof ProviderError
					? err.message
					: "Could not reach the local API proxy.",
			);
		} finally {
			setTesting(false);
		}
	}

	useEffect(() => {
		void loadProviders();
		storageEstimate().then(setUsage).catch(() => setUsage(null));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const exportAll = useMemo(
		() => () => {
			const payload = {
				app: "AI Vision Hub",
				version: 1,
				exportedAt: new Date().toISOString(),
				settings,
				projects: store.state.projects,
				scenes: store.state.scenes,
				characters: store.state.characters,
				scripts: store.state.scripts,
				media: store.state.media,
				note:
					"Metadata only. Media blobs stay in this browser's storage and are not included; use per-file download in the media library.",
			};
			downloadText(
				JSON.stringify(payload, null, 2),
				`ai-vision-hub-backup-${new Date().toISOString().slice(0, 10)}.json`,
				"application/json",
			);
			toast("Backup file downloaded", "ok");
		},
		[settings, store.state, toast],
	);

	async function onImportFile(file: File) {
		setImportError(null);
		try {
			const text = await file.text();
			const data = JSON.parse(text) as {
				projects?: unknown[];
				scenes?: unknown[];
				characters?: unknown[];
			};
			if (!Array.isArray(data.projects)) {
				setImportError("That file does not look like an AI Vision Hub backup.");
				return;
			}
			store.importBackup(data as never);
			toast("Backup restored", "ok");
		} catch {
			setImportError("Could not read that file. Select a JSON backup exported from this app.");
		}
	}

	return (
		<div className="stack" style={{ gap: 16 }}>
			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead title="Appearance" sub="Dark-first cinematic theme" />
				<Field label="Theme">
					{(id) => (
						<Select
							id={id}
							value={settings.theme}
							onChange={(e) => updateSettings({ theme: e.target.value as "dark" | "light" })}
						>
							<option value="dark">Dark (cinematic)</option>
							<option value="light">Light</option>
						</Select>
					)}
				</Field>
				<Checkbox
					checked={settings.reduceMotion}
					label="Reduce motion"
					hint="Minimises animation for comfort and battery on older phones."
					onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
				/>
				<Field label="Your name (used in greetings)">
					{(id) => (
						<TextInput
							id={id}
							value={settings.creatorName}
							onChange={(e) => updateSettings({ creatorName: e.target.value })}
							placeholder="Creator"
						/>
					)}
				</Field>
			</div>

			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead title="Defaults" sub="Applied to new projects" />
				<div className="grid grid--2">
					<Field label="Default aspect ratio">
						{(id) => (
							<Select
								id={id}
								value={settings.defaultAspectRatio}
								onChange={(e) =>
									updateSettings({ defaultAspectRatio: e.target.value as never })
								}
							>
								{ASPECT_RATIOS.map((r) => (
									<option key={r} value={r}>
										{r}
									</option>
								))}
							</Select>
						)}
					</Field>
					<Field label="Default language">
						{(id) => (
							<Select
								id={id}
								value={settings.defaultLanguage}
								onChange={(e) => updateSettings({ defaultLanguage: e.target.value })}
							>
								{LANGUAGES.map((l) => (
									<option key={l.value ?? l} value={l.value ?? l}>
										{(l as { label?: string }).label ?? l}
									</option>
								))}
							</Select>
						)}
					</Field>
				</div>
				<Field label="Export quality">
					{(id) => (
						<Select
							id={id}
							value={settings.exportQuality}
							onChange={(e) =>
								updateSettings({ exportQuality: e.target.value as "standard" | "high" })
							}
						>
							<option value="standard">Standard (faster, smaller file)</option>
							<option value="high">High (slower, larger file)</option>
						</Select>
					)}
				</Field>
			</div>

			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead
					title="AI providers"
					sub="Configured on the server, never in this browser"
					right={
						<Button
							size="sm"
							variant="ghost"
							icon={<IconRefresh size={15} />}
							busy={testing}
							onClick={() => void loadProviders()}
						>
							Test
						</Button>
					}
				/>
				{providerError && <Banner tone="warn">{providerError}</Banner>}
				{serverConfigured === false && !providerError && (
					<Banner tone="warn">
						The local API proxy reports no configured model. Script, image, video, voice and
						translation features that need a model will show setup steps instead of fake
						output.
					</Banner>
				)}
				<div className="stack" style={{ gap: 8 }}>
					{providers.length === 0 && !providerError ? (
						<p className="small muted" style={{ margin: 0 }}>
							Checking the local proxy…
						</p>
					) : (
						providers.map((p) => (
							<div key={p.id} className="row row--between row--wrap" style={{ gap: 8 }}>
								<div style={{ minWidth: 0 }}>
									<div className="small">{p.label}</div>
									<div className="tiny faint">{p.detail}</div>
								</div>
								<span className={`badge badge--${p.configured ? "ok" : "warn"}`}>
									{p.configured ? "configured" : "not configured"}
								</span>
							</div>
						))
					)}
				</div>
				<p className="tiny faint" style={{ margin: 0 }}>
					Credentials belong to the server process (Worker secrets or local .dev.vars). They are
					never stored in project exports, browser storage or logs. See README for the
					supported environment variables.
				</p>
			</div>

			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead title="Privacy" sub="Single-user, local-first" />
				<Checkbox
					checked={settings.allowExternalUploads}
					label="Allow sending prompts and reference media to the configured AI provider"
					hint="When off, generation buttons refuse to send anything and stay local."
					onChange={(e) => updateSettings({ allowExternalUploads: e.target.checked })}
				/>
				<p className="tiny faint" style={{ margin: 0 }}>
					There is no account, no public profile, no feed and no sharing feature. Project data
					stays in this browser unless you export it yourself.
				</p>
			</div>

			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead title="Storage and backup" />
				{usage ? (
					<p className="small muted" style={{ margin: 0 }}>
						Media blobs use about {formatBytes(usage.usage)} of this browser&apos;s storage.
						{usage.quota ? ` The browser reports roughly ${formatBytes(usage.quota)} available.` : ""}
					</p>
				) : (
					<p className="small muted" style={{ margin: 0 }}>
						Storage usage is unavailable in this browser.
					</p>
				)}
				<div className="row row--wrap" style={{ gap: 8 }}>
					<Button size="sm" icon={<IconDownload size={16} />} onClick={exportAll}>
						Export backup (JSON)
					</Button>
					<label className="btn btn--ghost btn--sm">
						<IconUpload size={16} /> Restore backup
						<input
							type="file"
							accept="application/json,.json"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) void onImportFile(file);
								e.target.value = "";
							}}
						/>
					</label>
				</div>
				{importError && <Banner tone="err">{importError}</Banner>}
				<p className="tiny faint" style={{ margin: 0 }}>
					Backups include project, scene, character and script metadata. Media files stay in
					browser storage and must be downloaded individually from the media library.
				</p>
			</div>

			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead title="About" />
				<p className="small muted" style={{ margin: 0 }}>
					AI Vision Hub — Imagine It. Direct It. Bring It to Life.
				</p>
				<div className="stack" style={{ gap: 6 }}>
					<p className="tiny faint" style={{ margin: 0 }}>
						<b>Works fully offline:</b> project wizard, script editor, character bible, scene
						planning, media library, subtitle export, project backup/restore.
					</p>
					<p className="tiny faint" style={{ margin: 0 }}>
						<b>Needs a configured model:</b> AI script writing, image generation, video
						generation, speech synthesis, translation and transcription.
					</p>
					<p className="tiny faint" style={{ margin: 0 }}>
						<b>Browser limits:</b> video export is produced by the browser&apos;s own recorder
						and depends on codec support; long-form films are assembled from several short
						clips.
					</p>
				</div>
				<Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>
					Delete all local data
				</Button>
			</div>

			<ConfirmDialog
				open={resetOpen}
				title="Delete all local data?"
				message="Every project, scene, character and stored media file on this device is erased. Export a backup first if you want to keep anything."
				confirmLabel="Erase everything"
				danger
				onCancel={() => setResetOpen(false)}
				onConfirm={() => {
					store.resetAll();
					setResetOpen(false);
					toast("All local data erased", "ok");
				}}
			/>
		</div>
	);
}
