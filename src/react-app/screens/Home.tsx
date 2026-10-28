import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { navigateTo } from "../lib/router";
import { LogoMark } from "../components/Logo";
import { Button, EmptyState, SectionHead, relativeTime } from "../components/ui";
import {
	IconChevronRight,
	IconClapper,
	IconFilm,
	IconGrid,
	IconImage,
	IconMic,
	IconPen,
	IconPlus,
	IconScissors,
	IconSearch,
	IconTranslate,
	IconVideo,
	IconUsers,
} from "../components/icons";
import { ASPECT_RATIOS } from "../lib/scriptTools";

const QUICK = [
	{ label: "Write Script", Icon: IconPen, path: "/wizard" },
	{ label: "Create Character", Icon: IconUsers, path: "/wizard" },
	{ label: "Plan Scenes", Icon: IconClapper, path: "/wizard" },
	{ label: "Generate Image", Icon: IconImage, path: "/wizard" },
	{ label: "Generate Video", Icon: IconVideo, path: "/wizard" },
	{ label: "Create Voiceover", Icon: IconMic, path: "/wizard" },
	{ label: "Translate", Icon: IconTranslate, path: "/wizard" },
	{ label: "Open Editor", Icon: IconScissors, path: "/library" },
];

export default function Home() {
	const { projects, settings, scenes } = useStore();
	const [query, setQuery] = useState("");

	const active = useMemo(
		() => projects.filter((p) => !p.archived),
		[projects],
	);
	const filtered = useMemo(
		() =>
			active.filter(
				(p) =>
					p.title.toLowerCase().includes(query.toLowerCase()) ||
					p.description.toLowerCase().includes(query.toLowerCase()),
			),
		[active, query],
	);
	const featured = active[0];
	const recent = [...active].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
	const activity = useMemo(
		() =>
			active
				.flatMap((p) => p.activity.map((a) => ({ ...a, project: p })))
				.sort((a, b) => b.at - a.at)
				.slice(0, 8),
		[active],
	);

	const greeting = (() => {
		const h = new Date().getHours();
		if (h < 12) return "Good morning";
		if (h < 18) return "Good afternoon";
		return "Good evening";
	})();

	return (
		<div className="stack" style={{ gap: 20 }}>
			<section className="hero">
				<div className="row" style={{ gap: 14, alignItems: "center" }}>
					<LogoMark size={54} id="home" />
					<div style={{ minWidth: 0 }}>
						<h1 className="hero__title" style={{ fontSize: "1.5rem" }}>
							AI VISION HUB
						</h1>
						<p className="hero__tag">
							{greeting}
							{settings.creatorName ? `, ${settings.creatorName}` : ""}. What are we making
							today?
						</p>
					</div>
				</div>
				<div className="hero__actions">
					<Button onClick={() => navigateTo("/wizard")} icon={<IconPlus size={18} />}>
						Create New Film
					</Button>
					<Button
						variant="ghost"
						onClick={() => navigateTo("/library")}
						icon={<IconFilm size={18} />}
					>
						All projects
					</Button>
				</div>
			</section>

			{featured && (
				<section className="card" style={{ padding: 0, overflow: "hidden" }}>
					<div
						style={{
							padding: "18px 16px",
							background:
								"linear-gradient(120deg, rgba(124,92,255,0.22), rgba(47,107,255,0.10) 55%, transparent)",
						}}
					>
						<span className="badge badge--violet">Featured project</span>
						<h2 className="section__title" style={{ marginTop: 8 }}>
							{featured.title}
						</h2>
						<p className="muted small" style={{ marginTop: 4 }}>
							{featured.description || "No description yet."}
						</p>
						<div className="row row--wrap" style={{ gap: 8, marginTop: 12 }}>
							<span className="badge">{featured.settings.aspectRatio}</span>
							<span className="badge">
								{featured.sceneIds.length}{" "}
								{featured.sceneIds.length === 1 ? "scene" : "scenes"}
							</span>
							<span className={`badge badge--${featured.status === "exported" ? "ok" : "warn"}`}>
								{featured.status}
							</span>
							<span className="tiny faint">edited {relativeTime(featured.updatedAt)}</span>
						</div>
						<div className="btn-row" style={{ marginTop: 14 }}>
							<Button onClick={() => navigateTo(`/project/${featured.id}`)}>Continue editing</Button>
							<Button
								variant="ghost"
								onClick={() => navigateTo(`/editor/${featured.id}`)}
								icon={<IconScissors size={17} />}
							>
								Editor
							</Button>
						</div>
					</div>
				</section>
			)}

			<section className="stack" style={{ gap: 12 }}>
				<SectionHead title="Quick actions" />
				<div className="quick-grid">
					{QUICK.map(({ label, Icon, path }) => (
						<button
							key={label}
							type="button"
							className="quick"
							onClick={() => navigateTo(path)}
						>
							<span className="quick__icon">
								<Icon size={20} />
							</span>
							<span className="quick__label">{label}</span>
						</button>
					))}
				</div>
			</section>

			{active.length === 0 ? (
				<section className="card">
					<EmptyState
						title="No films yet"
						body="Create your first film to unlock the script writer, character bible, scene manager and editor. Everything is stored locally on this device."
						action={
							<Button onClick={() => navigateTo("/wizard")} icon={<IconPlus size={18} />}>
								Create New Film
							</Button>
						}
					/>
				</section>
			) : (
				<section className="stack" style={{ gap: 12 }}>
					<SectionHead
						title="Continue editing"
						right={
							<button
								type="button"
								className="btn btn--ghost btn--sm"
								onClick={() => navigateTo("/library")}
							>
								View all <IconChevronRight size={16} />
							</button>
						}
					/>
					<div className="row row--wrap" style={{ gap: 8 }}>
						<input
							className="input"
							style={{ maxWidth: 260 }}
							placeholder="Search projects"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							aria-label="Search projects"
						/>
					</div>
					<div className="grid grid--auto">
						{filtered.map((p) => (
							<button
								key={p.id}
								type="button"
								className="project-card"
								style={{ textAlign: "left" }}
								onClick={() => navigateTo(`/project/${p.id}`)}
							>
								<div className="project-card__thumb">
									<p style={{ color: "var(--text-faint)", fontSize: "0.72rem" }}>
										{p.settings.aspectRatio}
									</p>
									<span className="badge">{p.sceneIds.length} scenes</span>
								</div>
								<div className="project-card__body">
									<div className="project-card__title">{p.title}</div>
									<div className="project-card__meta">
										edited {relativeTime(p.updatedAt)}
									</div>
								</div>
							</button>
						))}
						{filtered.length === 0 && (
							<p className="muted small">No projects match “{query}”.</p>
						)}
					</div>
				</section>
			)}

			{activity.length > 0 && (
				<section className="stack" style={{ gap: 12 }}>
					<SectionHead title="Recent activity" />
					<div className="card card--flat">
						<ul className="list-reset stack" style={{ gap: 10 }}>
							{activity.map((a) => (
								<li key={a.id} className="row row--between" style={{ gap: 10 }}>
									<span className="small" style={{ minWidth: 0 }}>
										<span className="badge badge--static">{a.kind}</span> {a.label}
									</span>
									<span className="tiny faint">{relativeTime(a.at)}</span>
								</li>
							))}
						</ul>
					</div>
				</section>
			)}

			<section className="card card--flat">
				<div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
					<IconGrid size={20} />
					<div className="stack" style={{ gap: 4 }}>
						<b className="small">Free-first by design</b>
						<p className="tiny faint">
							Project management, the script writer, character bible, scene planner and
							subtitle export all work offline. AI generation, AI voice and AI translation
							require you to connect a provider in Settings — the app never fabricates
							output.
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
