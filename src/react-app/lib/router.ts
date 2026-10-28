// Tiny hash-based router. No dependency, works on static hosting and PWA.

import { useCallback, useEffect, useState } from "react";

export interface Route {
	path: string;
	params: URLSearchParams;
}

function parse(hash: string): Route {
	const raw = hash.replace(/^#/, "") || "/";
	const [path, query = ""] = raw.split("?");
	return { path: path || "/", params: new URLSearchParams(query) };
}

export function useHashRoute(): [Route, (to: string) => void] {
	const [route, setRoute] = useState<Route>(() =>
		parse(typeof window === "undefined" ? "/" : window.location.hash),
	);

	useEffect(() => {
		const onChange = () => setRoute(parse(window.location.hash));
		window.addEventListener("hashchange", onChange);
		return () => window.removeEventListener("hashchange", onChange);
	}, []);

	const navigate = useCallback((to: string) => {
		const next = to.startsWith("#") ? to : `#${to}`;
		if (window.location.hash === next) {
			setRoute(parse(next));
			return;
		}
		window.location.hash = next;
		window.scrollTo({ top: 0, behavior: "auto" });
	}, []);

	return [route, navigate];
}

export function navigateTo(to: string) {
	window.location.hash = to.startsWith("#") ? to : `#${to}`;
}
