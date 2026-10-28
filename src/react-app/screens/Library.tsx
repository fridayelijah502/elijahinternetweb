import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { navigateTo } from "../lib/router";
import {
	Button,
	ConfirmDialog,
	EmptyState,
	Field,
	Modal,
	SectionHead,
	Select,
	TextArea,
	TextInput,
	relativeTime,
	useToast,
} from "../components/ui";
import {
	IconArchive,
	IconCopy,
	IconFilm,
	IconPlus,
	IconScissors,
	IconSearch,
	IconTrash,
} from "../components/icons";
import type { Project, ProjectStatus } from "../lib/types";
import { FILM_TYPES } from "../lib/scriptTools";

type SortKey = "updated" | "created" | "title" | "scenes";

export default function Library() {
	const { projects, duplicateProject, archiveProject, deleteProject, updateProject } = useStore();
	const toast = useToast();
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<SortKey>("updated");
	const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
	const [showArchived, setShowArchived] = useState(false);
	const [menuFor, setMenuFor] = useState<string | null>(null);
	const [renameFor, setRenameFor] = useState<Project | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

	const visible = useMemo(() => {
		const list = projects.filter((p) => (showArchived ? p.archived : !p.archived));
		const q = query.trim().toLowerCase();
		const filtered = q
			? list.filter(
					(p) =>
						p.title.toLowerCase().includes(q) ||
						p.description.toLowerCase().includes(q) ||
						(p.premise ?? "").toLowerCase().includes(q),
				)
			: list;
		const sorted = [...filtered].sort((a, b) => {
			switch (sort) {
				case "title":
					return a.title.localeCompare(b.title);
				case "created":
					return b.createdAt - a.createdAt;
				case "scenes":
					return b.sceneIds.length - a.sceneIds.length;
				default:
					return b.updatedAt - a.updatedAt;
			}
		});
		return sorted;
	}, [projects, query, sort, statusFilter, showArchived]);

	const counts = useMemo(
		() => ({
			all: projects.filter((p) => !p.archived).length,
			draft: projects.filter((p) => !p.archived && p.status === "draft").length,
			"in-progress": projects.filter((p) => !p.archived && p.status === "in-progress").length,
			exported: projects.filter((p) => !p.archived && p.status === "exported").length,
			archived: projects.filter((p) => p.archived).length,
		}),
		[projects],
	);

	return (
		<div className="stack" style={{ gap: 18 }}>
			<SectionHead
				title="Project library"
				sub="Everything is stored on this device. Nothing is uploaded unless you connect a provider."
				right={
					<Button
						size="sm"
						onClick={() => navigateTo("/wizard")}
						icon={<IconPlus size={16} />}
					>
						New
					</Button>
				}
			/>

			<div className="card card--flat stack" style={{ gap: 10 }}>
				<div className="row" style={{ gap: 8 }}>
					<input
						className="input"
						placeholder="Search title, description or premise"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						aria-label="Search projects"
					/>
					<button
						type="button"
						className="icon-btn"
						aria-label="Search"
						title="Search"
						onClick={() => setQuery((q) => q)}
					>
						<IconSearch size={19} />
					</button>
				</div>
				<div className="row row--wrap" style={{ gap: 8 }}>
					<Select
						aria-label="Sort projects"
						value={sort}
						onChange={(e) => setSort(e.target.value as SortKey)}
						style={{ maxWidth: 190 }}
					>
						<option value="updated">Recently edited</option>
						<option value="created">Recently created</option>
						<option value="title">Title A–Z</option>
						<option value="scenes">Most scenes</option>
					</Select>
					<Select
						aria-label="Filter by status"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as "all" | ProjectStatus)}
						style={{ maxWidth: 190 }}
					>
						<option value="all">Any status</option>
						<option value="draft">Draft</option>
						<option value="in-progress">In progress</option>
						<option value="exported">Exported</option>
					</Select>
					<button
						type="button"
						className={`chip ${showArchived ? "chip--active" : ""}`}
						onClick={() => setShowArchived((v) => !v)}
					>
						Archived ({counts.archived})
					</button>
				</div>
				<p className="tiny faint">
					{visible.length} of {projects.length} projects shown
				</p>
			</div>

			{visible.length === 0 ? (
				<section className="card">
					<EmptyState
						title={projects.length === 0 ? "No films yet" : "Nothing matches those filters"}
						body={
							projects.length === 0
								? "Create a film to unlock the script writer, character bible, scene manager and editor."
								: "Try a different search term, or clear the status filter."
						}
						action={
							projects.length === 0 ? (
								<Button onClick={() => navigateTo("/wizard")} icon={<IconPlus size={18} />}>
									Create New Film
								</Button>
							) : (
								<Button
									variant="ghost"
									onClick={() => {
										setQuery("");
										setStatusFilter("all");
										setShowArchived(false);
									}}
								>
									Clear filters
								</Button>
							)
						}
					/>
				</section>
			) : (
				<div className="grid grid--auto">
					{visible.map((p) => (
						<div key={p.id} className="project-card">
							<button
								type="button"
								className="project-card__thumb"
								onClick={() => navigateTo(`/project/${p.id}`)}
								aria-label={`Open ${p.title}`}
							>
								<span className="badge">{p.settings.aspectRatio}</span>
								<span className="badge badge--static">
									{p.sceneIds.length} {p.sceneIds.length === 1 ? "scene" : "scenes"}
								</span>
							</button>
							<div className="project-card__body">
								<div className="project-card__title">{p.title}</div>
								<div className="project-card__meta">
									{relativeTime(p.updatedAt)} · {p.status}
								</div>
								<p className="tiny faint" style={{ marginTop: 4 }}>
									{FILM_TYPES.find((f) => f.id === p.filmType)?.label ?? p.filmType}
								</p>
								<div className="btn-row" style={{ marginTop: 10 }}>
									<Button
										size="sm"
										onClick={() => navigateTo(`/project/${p.id}`)}
										icon={<IconFilm size={15} />}
									>
										Open
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => navigateTo(`/editor/${p.id}`)}
										icon={<IconScissors size={15} />}
									>
										Editor
									</Button>
									<button
										type="button"
										className="btn btn--ghost btn--sm"
										onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
									>
										More
									</button>
								</div>
								{menuFor === p.id && (
									<div className="card card--flat stack" style={{ gap: 8, marginTop: 10 }}>
										<Button
											size="sm"
											variant="ghost"
											block
											onClick={() => {
												setRenameFor(p);
												setRenameValue(p.title);
												setMenuFor(null);
											}}
										>
											Rename
										</Button>
										<Button
											size="sm"
											variant="ghost"
											block
											icon={<IconCopy size={15} />}
											onClick={() => {
												const copy = duplicateProject(p.id);
												toast(copy ? `Duplicated “${copy.title}”` : "Could not duplicate", "ok");
												setMenuFor(null);
											}}
										>
											Duplicate
										</Button>
										<Button
											size="sm"
											variant="ghost"
											block
											icon={<IconArchive size={15} />}
											onClick={() => {
												archiveProject(p.id, !p.archived);
												toast(p.archived ? "Restored" : "Archived", "ok");
												setMenuFor(null);
											}}
										>
											{p.archived ? "Restore" : "Archive"}
										</Button>
										<Button
											size="sm"
											variant="danger"
											block
											icon={<IconTrash size={15} />}
											onClick={() => {
												setConfirmDelete(p);
												setMenuFor(null);
											}}
										>
											Delete
										</Button>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			<Modal
				open={Boolean(renameFor)}
				title="Rename project"
				onClose={() => setRenameFor(null)}
				footer={
					<>
						<Button variant="ghost" block onClick={() => setRenameFor(null)}>
							Cancel
						</Button>
						<Button
							block
							onClick={() => {
								if (renameFor && renameValue.trim()) {
									updateProject(renameFor.id, { title: renameValue.trim() });
									toast("Renamed", "ok");
								}
								setRenameFor(null);
							}}
						>
							Save
						</Button>
					</>
				}
			>
				<Field label="Project title">
					{(id) => (
						<TextInput
							id={id}
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
							placeholder="Film title"
						/>
					)}
				</Field>
			</Modal>

			<ConfirmDialog
				open={Boolean(confirmDelete)}
				title="Delete project?"
				message={`“${confirmDelete?.title}” and its ${confirmDelete?.sceneIds.length ?? 0} scene(s) will be removed from this device. Media files are not deleted. This cannot be undone.`}
				confirmLabel="Delete"
				danger
				onConfirm={() => {
					if (confirmDelete) {
						deleteProject(confirmDelete.id);
						toast("Project deleted", "ok");
					}
					setConfirmDelete(null);
				}}
				onCancel={() => setConfirmDelete(null)}
			/>

			<TextArea className="sr-only" aria-hidden readOnly value="" />
		</div>
	);
}
