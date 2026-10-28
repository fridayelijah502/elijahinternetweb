// Consistent icon system. All icons are 24x24, stroke-based, currentColor.

interface IconProps {
	size?: number;
	className?: string;
}

function Svg({
	size = 22,
	className,
	children,
}: IconProps & { children: React.ReactNode }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
			focusable="false"
		>
			{children}
		</svg>
	);
}

export const IconHome = (p: IconProps) => (
	<Svg {...p}>
		<path d="M3 10.5 12 3l9 7.5" />
		<path d="M5 9.8V20h14V9.8" />
		<path d="M9.5 20v-6h5v6" />
	</Svg>
);

export const IconLibrary = (p: IconProps) => (
	<Svg {...p}>
		<rect x="3" y="4" width="7.5" height="7.5" rx="1.5" />
		<rect x="13.5" y="4" width="7.5" height="7.5" rx="1.5" />
		<rect x="3" y="14.5" width="7.5" height="6" rx="1.5" />
		<rect x="13.5" y="14.5" width="7.5" height="6" rx="1.5" />
	</Svg>
);

export const IconClapper = (p: IconProps) => (
	<Svg {...p}>
		<path d="M3 8.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z" />
		<path d="M3 8.5 4.6 4h2.2l-1.5 4.5" />
		<path d="M8.3 8.5 6.8 4h2.2l1.5 4.5" />
		<path d="M13.6 8.5 12.1 4h2.2l1.5 4.5" />
		<path d="M18.9 8.5 17.4 4h2.2l1.5 4.5" />
	</Svg>
);

export const IconUsers = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="9" cy="8" r="3.2" />
		<path d="M3 20a6 6 0 0 1 12 0" />
		<path d="M16 5.4a3.2 3.2 0 0 1 0 5.2" />
		<path d="M17.5 14.5A6 6 0 0 1 21 20" />
	</Svg>
);

export const IconImage = (p: IconProps) => (
	<Svg {...p}>
		<rect x="3" y="4.5" width="18" height="15" rx="2" />
		<circle cx="8.5" cy="9.5" r="1.6" />
		<path d="m4 17 4.8-4.6a2 2 0 0 1 2.7 0L17 17.5" />
		<path d="m13.5 14 2.2-2.1a2 2 0 0 1 2.7 0L21 14.5" />
	</Svg>
);

export const IconVideo = (p: IconProps) => (
	<Svg {...p}>
		<rect x="2.5" y="6" width="13" height="12" rx="2" />
		<path d="m15.5 11 5.2-3v8l-5.2-3z" />
	</Svg>
);

export const IconMic = (p: IconProps) => (
	<Svg {...p}>
		<rect x="9" y="3" width="6" height="11" rx="3" />
		<path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
		<path d="M12 17.5V21M9 21h6" />
	</Svg>
);

export const IconTranslate = (p: IconProps) => (
	<Svg {...p}>
		<path d="M3 5h9" />
		<path d="M7.5 5V3.5" />
		<path d="M3 9.5c2.6 0 4.7-1.4 6-3.4" />
		<path d="M5.4 7c1 2.6 3.3 4.6 6 5.4" />
		<path d="m13 21 4-9 4 9" />
		<path d="M14.4 17.6h5.2" />
	</Svg>
);

export const IconScissors = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="6" cy="6.5" r="2.6" />
		<circle cx="6" cy="17.5" r="2.6" />
		<path d="M8.2 7.9 20 18" />
		<path d="M8.2 16.1 20 6" />
	</Svg>
);

export const IconSettings = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="3.2" />
		<path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
	</Svg>
);

export const IconPlus = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 5v14M5 12h14" />
	</Svg>
);

export const IconSearch = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="11" cy="11" r="6.5" />
		<path d="m16 16 4.5 4.5" />
	</Svg>
);

export const IconChevronLeft = (p: IconProps) => (
	<Svg {...p}>
		<path d="m14.5 5-7 7 7 7" />
	</Svg>
);

export const IconChevronRight = (p: IconProps) => (
	<Svg {...p}>
		<path d="m9.5 5 7 7-7 7" />
	</Svg>
);

export const IconChevronDown = (p: IconProps) => (
	<Svg {...p}>
		<path d="m5 9.5 7 7 7-7" />
	</Svg>
);

export const IconClose = (p: IconProps) => (
	<Svg {...p}>
		<path d="M6 6l12 12M18 6 6 18" />
	</Svg>
);

export const IconCheck = (p: IconProps) => (
	<Svg {...p}>
		<path d="m4.5 12.5 5 5 10-11" />
	</Svg>
);

export const IconCopy = (p: IconProps) => (
	<Svg {...p}>
		<rect x="8.5" y="8.5" width="12" height="12" rx="2" />
		<path d="M15.5 5.5v-1a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" />
	</Svg>
);

export const IconTrash = (p: IconProps) => (
	<Svg {...p}>
		<path d="M4 7h16" />
		<path d="M9.5 7V4.8h5V7" />
		<path d="M6 7l1 12.2a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7" />
		<path d="M10.5 11v6M13.5 11v6" />
	</Svg>
);

export const IconDownload = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 3.5v11" />
		<path d="m7.5 10 4.5 4.5 4.5-4.5" />
		<path d="M4 19.5h16" />
	</Svg>
);

export const IconUpload = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 20V9" />
		<path d="m7.5 13 4.5-4.5 4.5 4.5" />
		<path d="M4 4.5h16" />
	</Svg>
);

export const IconSpark = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11 10.1 9z" />
	</Svg>
);

export const IconArrowUp = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 19V5" />
		<path d="m6 11 6-6 6 6" />
	</Svg>
);

export const IconArrowDown = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 5v14" />
		<path d="m6 13 6 6 6-6" />
	</Svg>
);

export const IconArchive = (p: IconProps) => (
	<Svg {...p}>
		<rect x="3" y="4" width="18" height="4.5" rx="1.2" />
		<path d="M5 8.5v10a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-10" />
		<path d="M10 12.5h4" />
	</Svg>
);

export const IconFilm = (p: IconProps) => (
	<Svg {...p}>
		<rect x="2.5" y="4.5" width="19" height="15" rx="2" />
		<path d="M7 4.5v15M17 4.5v15M2.5 12h19M2.5 8.2h4.5M2.5 15.8h4.5M17 8.2h4.5M17 15.8h4.5" />
	</Svg>
);

export const IconPen = (p: IconProps) => (
	<Svg {...p}>
		<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
		<path d="m14.5 6.5 3 3" />
	</Svg>
);

export const IconPlay = (p: IconProps) => (
	<Svg {...p}>
		<path d="M7 4.8 19 12 7 19.2z" />
	</Svg>
);

export const IconPause = (p: IconProps) => (
	<Svg {...p}>
		<rect x="6.5" y="4.5" width="4" height="15" rx="1.2" />
		<rect x="13.5" y="4.5" width="4" height="15" rx="1.2" />
	</Svg>
);

export const IconRefresh = (p: IconProps) => (
	<Svg {...p}>
		<path d="M20 11a8 8 0 1 0-.6 4" />
		<path d="M20 4.5V11h-6" />
	</Svg>
);

export const IconInfo = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="8.5" />
		<path d="M12 11v5.5" />
		<path d="M12 7.8h.01" />
	</Svg>
);

export const IconWarning = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 4 21 19.5H3z" />
		<path d="M12 10v4" />
		<path d="M12 16.8h.01" />
	</Svg>
);

export const IconMenu = (p: IconProps) => (
	<Svg {...p}>
		<path d="M4 7h16M4 12h16M4 17h16" />
	</Svg>
);

export const IconGrid = (p: IconProps) => (
	<Svg {...p}>
		<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
	</Svg>
);
