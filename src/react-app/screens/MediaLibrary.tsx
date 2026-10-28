import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import {
	Button,
	EmptyState,
	Field,
	Modal,
	SectionHead,
	Select,
	TextInput,
	formatBytes,
	useToast,
} from "../components/ui";
import { IconDownload, IconSearch, IconTrash, IconUpload } from "../components/icons";
import {
	ACCEPTED,
	MAX_UPLOAD_BYTES,
	downloadBlob,
	kindFromMime,
	loadBlob,
	makeMediaItem,
	objectUrl,
	removeBlob,
	saveBlob,
} from "../lib/media";
import { storageEstimate } from "../lib/storage";
import type { MediaItem, MediaKind } from "../lib/types";

const KINDS: MediaKind[] = ["image", "video", "audio", "subtitle", "export", "other"];

export default function MediaLibrary() {
	const store = useStore();
	const toast = useToast();
	const [query, setQuery] = useState("");
	const [kind, setKind] = useState<MediaKind | "all">("all");
	const [projectFilter, setProjectFilter] = useState<string>("all");
	const [preview, setPreview] = useState<MediaItem | null>(null);
	const [renaming, setRenaming] = useState<MediaItem | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [confirm, setConfirm] = useState<MediaItem | null>(null);
	const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
	const [busy, setBusy] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		storageEstimate().then(setUsage).catch(() => setUsage(null));
	}, [store.media.length]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return store.media
			.filter((m) => (kind === "all" ? true : m.kind === kind))
			.filter((m) => (projectFilter === "all" ? true : (m.projectId ?? "") === projectFilter))
			.filter((m) => (q ? m.name.toLowerCase().includes(q) : true))
			.sort((a, b) => b.createdAt - a.createdAt);
	}, [store.media, query, kind, projectFilter]);

	async function onFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		setBusy(true);
		let added = 0;
		for (const file of Array.from(files)) {
			if (file.size > MAX_UPLOAD_BYTES) {
				toast(`${file.name} is larger than ${formatBytes(MAX_UPLOAD_BYTES)}`, "err");
				continue;
			}
			const item = makeMediaItem({
				kind: kindFromMime(file.type, file.name),
				name: file.name,
				mime: file.type || "application/octet-stream",
				size: file.size,
				origin: "import",
			});
			const ok = await saveBlob(item, file);
			if (!ok) {
				toast(`Could not store ${file.name}`, "err");
				continue;
			}
			store.addMedia(item);
			added += 1;
		}
		setBusy(false);
		if (added > 0) {
			toast(`Added ${added} file${added > 1 ? "s" : ""}`, "ok");
			store.logActivity(
				store.projects[0]?.id ?? "library",
				"media",
				`Imported ${added} file${added > 1 ? "s" : ""}`,
			);
		}
		if (fileRef.current) fileRef.current.value = "";
	}

	async function download(item: MediaItem) {
		const blob = await loadBlob(item.id);
		if (!blob) {
			toast("The file data is missing from this device", "err");
			return;
		}
		downloadBlob(blob, item.name);
	}

	async function remove(item: MediaItem) {
		await removeBlob(item.id);
		store.deleteMedia(item.id);
		setConfirm(null);
		toast("File deleted", "ok");
	}

	return (
		<div className="stack" style={{ gap: 16 }}>
			<div className="card stack" style={{ gap: 12 }}>
				<SectionHead
					title="Media library"
					sub="Images, clips, audio, subtitles and exports stored on this device"
					right={
						<Button
							size="sm"
							icon={<IconUpload size={16} />}
							busy={busy}
							onClick={() => fileRef.current?.click()}
						>
							Upload
						</Button>
					}
				/>
				<input
					ref={fileRef}
					type="file"
					multiple
					accept="image/*,video/*,audio/*,.srt,.vtt,.txt"
					className="hidden"
					onChange={(e) => onFiles(e.target.files)}
				/>
				<div className="row row--wrap" style={{ gap: 8 }}>
					<div className="row" style={{ gap: 6, flex: "1 1 180px", minWidth: 0 }}>
						<IconSearch size={16} />
						<TextInput
							placeholder="Search files"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
					<Select
						aria-label="Filter by type"
						value={kind}
						onChange={(e) => setKind(e.target.value as MediaKind | "all")}
						style={{ flex: "0 0 auto", width: "auto" }}
					>
						<option value="all">All types</option>
						{KINDS.map((k) => (
							<option key={k} value={k}>
								{k}
							</option>
						))}
					</Select>
				</div>
				<Field label="Project">
					{(id) => (
						<Select
							id={id}
							value={projectFilter}
							onChange={(e) => setProjectFilter(e.target.value)}
						>
							<option value="all">All projects</option>
							{store.projects.map((p) => (
								<option key={p.id} value={p.id}>
									{p.title}
								</option>
							))}
						</Select>
					)}
				</Field>
				{usage && (
					<p className="tiny faint" style={{ margin: 0 }}>
						Local storage used: {formatBytes(usage.usage)}
						{usage.quota ? ` of about ${formatBytes(usage.quota)} available` : ""}. Large files
						stay on this device only — there is no cloud copy.
					</p>
				)}
			</div>

			{filtered.length === 0 ? (
				<EmptyState
					title={store.media.length === 0 ? "No media yet" : "Nothing matches those filters"}
					body={
						store.media.length === 0
							? "Upload images, video clips, audio or subtitle files, or generate media from a project scene."
							: "Try a different search term, type or project."
					}
					action={
						store.media.length === 0 ? (
							<Button icon={<IconUpload size={16} />} onClick={() => fileRef.current?.click()}>
								Upload files
							</Button>
						) : undefined
					}
				/>
			) : (
				<div className="thumb-grid">
					{filtered.map((m) => (
						<MediaCard
							key={m.id}
							item={m}
							projectTitle={
								store.projects.find((p) => p.id === m.projectId)?.title ?? "Unassigned"
							}
							onPreview={() => setPreview(m)}
							onDownload={() => download(m)}
							onRename={() => {
								setRenaming(m);
								setRenameValue(m.name);
							}}
							onDelete={() => setConfirm(m)}
						/>
					))}
				</div>
			)}

			<Modal
				open={Boolean(preview)}
				title={preview?.name ?? ""}
				onClose={() => setPreview(null)}
				footer={
					preview && (
						<Button icon={<IconDownload size={16} />} onClick={() => download(preview)}>
							Download
						</Button>
					)
				}
			>
				{preview && <MediaPreview item={preview} />}
			</Modal>

			<Modal
				open={Boolean(renaming)}
				title="Rename file"
				onClose={() => setRenaming(null)}
				footer={
					<Button
						onClick={() => {
							if (renaming && renameValue.trim()) {
								store.updateMedia(renaming.id, { name: renameValue.trim() });
								toast("File renamed", "ok");
							}
							setRenaming(null);
						}}
					>
						Save name
					</Button>
				}
			>
				<Field label="File name">
					{(id) => (
						<TextInput
							id={id}
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
						/>
					)}
				</Field>
			</Modal>

			<Modal
				open={Boolean(confirm)}
				title="Delete file?"
				onClose={() => setConfirm(null)}
				footer={
					<>
						<Button variant="ghost" onClick={() => setConfirm(null)}>
							Cancel
						</Button>
						<Button
							variant="danger"
							onClick={() => {
								if (confirm) remove(confirm);
							}}
						>
							Delete permanently
						</Button>
					</>
				}
			>
				<p className="small muted" style={{ margin: 0 }}>
					&quot;{confirm?.name}&quot; will be removed from this device. Scenes that reference it
					will show a missing-file error.
				</p>
			</Modal>
		</div>
	);
}

function MediaCard({
	item,
	projectTitle,
	onPreview,
	onDownload,
	onRename,
	onDelete,
}: {
	item: MediaItem;
	projectTitle: string;
	onPreview: () => void;
	onDownload: () => void;
	onRename: () => void;
	onDelete: () => void;
}) {
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		let revoked = false;
		let created: string | null = null;
		objectUrl(item.id).then((u) => {
			if (revoked) {
				if (u) URL.revokeObjectURL(u);
				return;
			}
			created = u;
			setUrl(u);
		});
		return () => {
			revoked = true;
			if (created) URL.revokeObjectURL(created);
		};
	}, [item.id]);

	return (
		<div className="thumb">
			<button
				type="button"
				className="thumb__img"
				style={{ border: 0, padding: 0, width: "100%", background: "transparent" }}
				onClick={onPreview}
				aria-label={`Preview ${item.name}`}
			>
				{url && item.kind === "image" && <img src={url} alt={item.name} loading="lazy" />}
				{url && item.kind === "video" && <video src={url} muted playsInline preload="metadata" />}
				{!url && (
					<span className="tiny faint" style={{ padding: 8 }}>
						{item.kind}
					</span>
				)}
			</button>
			<span className="thumb__label">{item.name}</span>
			<span className="tiny faint">
				{formatBytes(item.size)} · {item.kind} · {projectTitle}
			</span>
			<div className="row" style={{ gap: 6 }}>
				<Button size="sm" variant="ghost" onClick={onDownload}>
					Save
				</Button>
				<Button size="sm" variant="ghost" onClick={onRename}>
					Rename
				</Button>
				<Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete file">
					<IconTrash size={15} />
				</Button>
			</div>
		</div>
	);
}

function MediaPreview({ item }: { item: MediaItem }) {
	const [url, setUrl] = useState<string | null>(null);
	useEffect(() => {
		let revoked = false;
		objectUrl(item.id).then((u) => {
			if (revoked) {
				if (u) URL.revokeObjectURL(u);
				return;
			}
			setUrl(u);
		});
		return () => {
			revoked = true;
		};
	}, [item.id]);

	return (
		<div className="stack" style={{ gap: 8 }}>
			{url && item.kind === "image" && (
				<img src={url} alt={item.name} style={{ width: "100%", borderRadius: 12 }} />
			)}
			{url && item.kind === "video" && (
				<video src={url} controls playsInline style={{ width: "100%", borderRadius: 12 }} />
			)}
			{url && item.kind === "audio" && <audio src={url} controls style={{ width: "100%" }} />}
			{url && (item.kind === "subtitle" || item.kind === "other") && (
				<SubtitleView item={item} />
			)}
			<p className="tiny faint" style={{ margin: 0 }}>
				{item.mime} · {formatBytes(item.size)} · {item.origin}
			</p>
		</div>
	);
}

function SubtitleView({ item }: { item: MediaItem }) {
	const [text, setText] = useState("Loading…");
	useEffect(() => {
		loadBlob(item.id)
			.then((b) => (b ? b.text() : ""))
			.then((t) => setText(t || "(empty file)"))
			.catch(() => setText("Could not read this file"));
	}, [item.id]);
	return (
		<pre
			style={{
				maxHeight: 260,
				overflow: "auto",
				fontSize: 12,
				background: "var(--surface-2)",
				padding: 10,
				borderRadius: 10,
			}}
		>
			{text}
		</pre>
	);
}
