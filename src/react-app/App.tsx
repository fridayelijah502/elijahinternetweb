import { useEffect, useMemo, useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { ToastProvider } from "./components/ui";
import { useHashRoute } from "./lib/router";
import { LogoMark, Wordmark } from "./components/Logo";
import {
	IconClapper,
	IconGrid,
	IconHome,
	IconLibrary,
	IconMenu,
	IconPlus,
	IconSettings,
} from "./components/icons";
import Home from "./screens/Home";
import Library from "./screens/Library";
import Wizard from "./screens/Wizard";
import ProjectWorkspace from "./screens/ProjectWorkspace";
import MediaLibrary from "./screens/MediaLibrary";
import SettingsScreen from "./screens/Settings";
import EditorScreen from "./screens/Editor";
import Onboarding from "./screens/Onboarding";
import { navigateTo } from "./lib/router";

const NAV = [
	{ path: "/", label: "Home", Icon: IconHome },
	{ path: "/library", label: "Projects", Icon: IconLibrary },
	{ path: "/wizard", label: "Create", Icon: IconPlus },
	{ path: "/media", label: "Media", Icon: IconGrid },
	{ path: "/settings", label: "Settings", Icon: IconSettings },
];

function Splash() {
	return (
		<div className="splash">
			<div className="splash__inner">
				<LogoMark size={92} id="splash" />
				<h1 className="hero__title">AI VISION HUB</h1>
				<p className="hero__tag">Imagine It. Direct It. Bring It to Life.</p>
				<div className="splash__bar" aria-hidden="true">
					<span />
				</div>
			</div>
		</div>
	);
}

function SideNav({ current }: { current: string }) {
	return (
		<nav className="sidenav" aria-label="Main">
			<div style={{ padding: "4px 6px 14px" }}>
				<Wordmark />
			</div>
			{NAV.map(({ path, label, Icon }) => (
				<button
					key={path}
					type="button"
					className="btn btn--ghost btn--sm"
					style={{ justifyContent: "flex-start" }}
					aria-current={current === path ? "page" : undefined}
					onClick={() => navigateTo(path)}
				>
					<Icon size={19} />
					{label}
				</button>
			))}
			<div className="spacer" />
			<p className="tiny faint" style={{ padding: "10px 8px" }}>
				Local-first. Your scripts stay on this device unless you explicitly send them to a
				configured AI provider.
			</p>
		</nav>
	);
}

function BottomNav({ current }: { current: string }) {
	return (
		<nav className="bottomnav" aria-label="Main">
			{NAV.map(({ path, label, Icon }) => (
				<button
					key={path}
					type="button"
					className="bottomnav__item"
					aria-current={current === path ? "page" : undefined}
					onClick={() => navigateTo(path)}
				>
					<Icon size={21} />
					<span>{label}</span>
				</button>
			))}
		</nav>
	);
}

function TopBar({
	title,
	sub,
	right,
}: {
	title: string;
	sub?: string;
	right?: React.ReactNode;
}) {
	return (
		<header className="topbar">
			<div className="row" style={{ gap: 10, minWidth: 0 }}>
				<span style={{ minWidth: 0 }}>
					<span className="topbar__title">{title}</span>
					{sub && <span className="topbar__sub" style={{ display: "block" }}>{sub}</span>}
				</span>
			</div>
			<div className="row" style={{ gap: 6 }}>
				{right}
			</div>
		</header>
	);
}

function Router() {
	const [route] = useHashRoute();
	const { settings, updateSettings } = useStore();
	const [ready, setReady] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		const t = window.setTimeout(() => setReady(true), 900);
		return () => window.clearTimeout(t);
	}, []);

	const current = route.path;
	const path = useMemo(() => current.replace(/\/$/, "") || "/", [current]);

	if (!ready) return <Splash />;
	if (!settings.onboarded) return <Onboarding />;

	const isProject = path.startsWith("/project/");
	const isEditor = path.startsWith("/editor/");
	const projectId = isProject ? path.split("/")[2] : undefined;
	const editorProjectId = isEditor ? path.split("/")[2] : undefined;

	let screen: React.ReactNode;
	let title = "AI Vision Hub";
	let sub: string | undefined;

	switch (true) {
		case path === "/":
			screen = <Home />;
			title = "AI Vision Hub";
			break;
		case path === "/library":
			screen = <Library />;
			title = "Projects";
			break;
		case path === "/wizard":
			screen = <Wizard />;
			title = "New Film";
			break;
		case path === "/media":
			screen = <MediaLibrary />;
			title = "Media Library";
			break;
		case path === "/settings":
			screen = <SettingsScreen />;
			title = "Settings";
			break;
		case isProject:
			screen = <ProjectWorkspace projectId={projectId!} />;
			title = "Workspace";
			break;
		case isEditor:
			screen = <EditorScreen projectId={editorProjectId!} />;
			title = "Editor";
			break;
		default:
			screen = (
				<div className="card">
					<h2 className="card__title">Page not found</h2>
					<p className="muted small">That screen does not exist.</p>
					<button className="btn btn--primary" onClick={() => navigateTo("/")}>
						Back home
					</button>
				</div>
			);
	}

	return (
		<div className="app">
			<SideNav current={path} />
			<TopBar
				title={title}
				sub={sub}
				right={
					<>
						{!isProject && (
							<button
								type="button"
								className="icon-btn"
								aria-label="Menu"
								onClick={() => setMenuOpen((v) => !v)}
							>
								<IconMenu size={20} />
							</button>
						)}
						<button
							type="button"
							className="icon-btn"
							aria-label="Settings"
							onClick={() => navigateTo("/settings")}
						>
							<IconSettings size={20} />
						</button>
					</>
				}
			/>
			{menuOpen && (
				<div className="card" style={{ margin: "0 14px 12px" }}>
					<div className="row row--wrap" style={{ gap: 8 }}>
						{NAV.filter((n) => n.path !== "/wizard").map(({ path: p, label, Icon }) => (
							<button
								key={p}
								type="button"
								className={`chip ${current === p ? "chip--active" : ""}`}
								onClick={() => {
									navigateTo(p);
									setMenuOpen(false);
								}}
							>
								<Icon size={15} /> {label}
							</button>
						))}
					</div>
				</div>
			)}
			<main className="main">{screen}</main>
			<BottomNav current={path} />
		</div>
	);
}

export default function App() {
	return (
		<StoreProvider>
			<ToastProvider>
				<Router />
			</ToastProvider>
		</StoreProvider>
	);
}
