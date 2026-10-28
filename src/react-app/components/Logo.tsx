// AI VISION HUB brand mark: cinematic aperture fused with an AI spark.

export function LogoMark({ size = 40, id = "avh" }: { size?: number; id?: string }) {
	const gid = `${id}-grad`;
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 64 64"
			fill="none"
			role="img"
			aria-label="AI Vision Hub logo"
			className="logo-mark"
		>
			<defs>
				<linearGradient id={gid} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
					<stop stopColor="#A08CFF" />
					<stop offset="0.55" stopColor="#7C5CFF" />
					<stop offset="1" stopColor="#2F6BFF" />
				</linearGradient>
				<radialGradient id={`${gid}-core`} cx="0.5" cy="0.5" r="0.5">
					<stop stopColor="#46E6FF" />
					<stop offset="1" stopColor="#46E6FF" stopOpacity="0" />
				</radialGradient>
			</defs>

			<circle cx="32" cy="32" r="30" stroke={`url(#${gid})`} strokeWidth="2.4" opacity="0.85" />
			<circle cx="32" cy="32" r="21" stroke={`url(#${gid})`} strokeWidth="1.2" opacity="0.35" />

			{/* Aperture blades */}
			<g stroke={`url(#${gid})`} strokeWidth="2" strokeLinejoin="round" opacity="0.95">
				<path d="M32 11 L47 22 L40 38 L22 38 L17 22 Z" opacity="0.5" />
				<path d="M32 11 L47 22" />
				<path d="M47 22 L40 38" />
				<path d="M40 38 L22 38" />
				<path d="M22 38 L17 22" />
				<path d="M17 22 L32 11" />
			</g>

			{/* AI spark */}
			<path
				d="M32 20 L35.4 28.6 L44 32 L35.4 35.4 L32 44 L28.6 35.4 L20 32 L28.6 28.6 Z"
				fill={`url(#${gid})`}
				opacity="0.95"
			/>
			<circle cx="32" cy="32" r="7" fill={`url(#${gid}-core)`} opacity="0.8" />
		</svg>
	);
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
	return (
		<span className="row" style={{ gap: 10 }}>
			<LogoMark size={compact ? 28 : 34} id={compact ? "avh-c" : "avh-w"} />
			<span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
				<span
					style={{
						fontWeight: 750,
						letterSpacing: "0.02em",
						fontSize: compact ? "0.86rem" : "0.98rem",
					}}
				>
					AI VISION HUB
				</span>
				{!compact && (
					<span className="tiny" style={{ color: "var(--text-faint)", letterSpacing: "0.06em" }}>
						Imagine It. Direct It. Bring It to Life.
					</span>
				)}
			</span>
		</span>
	);
}
