// Shared UI primitives. Mobile-first, large touch targets, dark-first.

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useState,
	type ButtonHTMLAttributes,
	type InputHTMLAttributes,
	type ReactNode,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from "react";

/* ----------------------------------- Toast ----------------------------------- */

interface Toast {
	id: number;
	message: string;
	tone: "ok" | "err" | "info";
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
		const id = Date.now() + Math.random();
		setToasts((prev) => [...prev, { id, message, tone }]);
		window.setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 4200);
	}, []);

	return (
		<ToastContext.Provider value={push}>
			{children}
			<div className="toast-wrap" role="status" aria-live="polite">
				{toasts.map((t) => (
					<div key={t.id} className={`toast toast--${t.tone}`}>
						{t.message}
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	return useContext(ToastContext);
}

/* ---------------------------------- Buttons ---------------------------------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "ghost" | "danger";
	size?: "sm" | "md";
	block?: boolean;
	busy?: boolean;
	icon?: ReactNode;
}

export function Button({
	variant = "primary",
	size = "md",
	block,
	busy,
	icon,
	children,
	className = "",
	disabled,
	...rest
}: ButtonProps) {
	return (
		<button
			type="button"
			disabled={disabled || busy}
			className={`btn btn--${variant} ${size === "sm" ? "btn--sm" : ""} ${
				block ? "btn--block" : ""
			} ${className}`}
			{...rest}
		>
			{busy ? <span className="spinner" aria-hidden="true" /> : icon}
			{children}
		</button>
	);
}

export function IconButton({
	label,
	children,
	className = "",
	...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			className={`icon-btn ${className}`}
			{...rest}
		>
			{children}
		</button>
	);
}

/* ----------------------------------- Fields ---------------------------------- */

interface FieldProps {
	label: string;
	hint?: string;
	children: (id: string) => ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
	const id = useId();
	return (
		<div className="field">
			<label className="field__label" htmlFor={id}>
				{label}
			</label>
			{children(id)}
			{hint && <p className="field__hint">{hint}</p>}
		</div>
	);
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`input ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea {...props} className={`textarea ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select {...props} className={`select ${props.className ?? ""}`}>
			{props.children}
		</select>
	);
}

export function Checkbox({
	label,
	checked,
	onChange,
	hint,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
	hint?: string;
}) {
	return (
		<label className="checkbox">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span>
				{label}
				{hint && <span className="field__hint">{hint}</span>}
			</span>
		</label>
	);
}

export function Chips<T extends string>({
	options,
	value,
	onChange,
	multi,
}: {
	options: { value: T; label: string }[];
	value: T | T[];
	onChange: (v: T) => void;
	multi?: boolean;
}) {
	const values = Array.isArray(value) ? value : [value];
	return (
		<div className="chips">
			{options.map((opt) => {
				const active = values.includes(opt.value);
				return (
					<button
						key={opt.value}
						type="button"
						className={`chip ${active ? "chip--active" : ""}`}
						aria-pressed={active}
						onClick={() => onChange(opt.value)}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

/* ----------------------------------- Modal ----------------------------------- */

export function Modal({
	open,
	title,
	onClose,
	children,
	footer,
}: {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
}) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;
	return (
		<div className="overlay" onClick={onClose}>
			<div
				className="sheet"
				role="dialog"
				aria-modal="true"
				aria-label={title}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="sheet__head">
					<h3 className="sheet__title">{title}</h3>
					<IconButton label="Close" onClick={onClose}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
							<path d="M6 6l12 12M18 6 6 18" />
						</svg>
					</IconButton>
				</div>
				<div className="stack">{children}</div>
				{footer && <div className="btn-row">{footer}</div>}
			</div>
		</div>
	);
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = "Confirm",
	danger,
	onConfirm,
	onCancel,
}: {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<Modal
			open={open}
			title={title}
			onClose={onCancel}
			footer={
				<>
					<Button variant="ghost" onClick={onCancel} block>
						Cancel
					</Button>
					<Button variant={danger ? "danger" : "primary"} onClick={onConfirm} block>
						{confirmLabel}
					</Button>
				</>
			}
		>
			<p className="muted">{message}</p>
		</Modal>
	);
}

/* ----------------------------------- Bits ----------------------------------- */

export function EmptyState({
	title,
	body,
	action,
}: {
	title: string;
	body: string;
	action?: ReactNode;
}) {
	return (
		<div className="empty">
			<div className="empty__title">{title}</div>
			<p className="muted small">{body}</p>
			{action}
		</div>
	);
}

export function Banner({
	tone = "ok",
	children,
}: {
	tone?: "ok" | "warn" | "err";
	children: ReactNode;
}) {
	return <div className={`banner banner--${tone}`}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
	return (
		<span className="row" style={{ gap: 8 }}>
			<span className="spinner" aria-hidden="true" />
			{label && <span className="small muted">{label}</span>}
		</span>
	);
}

export function SectionHead({
	title,
	sub,
	right,
}: {
	title: string;
	sub?: string;
	right?: ReactNode;
}) {
	return (
		<div className="section__head">
			<div>
				<h2 className="section__title">{title}</h2>
				{sub && <p className="tiny faint">{sub}</p>}
			</div>
			{right}
		</div>
	);
}

export function Tabs<T extends string>({
	tabs,
	value,
	onChange,
}: {
	tabs: { value: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="tabbar" role="tablist">
			{tabs.map((t) => (
				<button
					key={t.value}
					role="tab"
					aria-selected={value === t.value}
					className={`tab ${value === t.value ? "tab--active" : ""}`}
					onClick={() => onChange(t.value)}
				>
					{t.label}
				</button>
			))}
		</div>
	);
}

export function Stepper({
	total,
	current,
	labels,
}: {
	total: number;
	current: number;
	labels?: string[];
}) {
	return (
		<div className="stepper" aria-label={`Step ${current + 1} of ${total}`}>
			{Array.from({ length: total }).map((_, i) => (
				<span
					key={i}
					className={`stepper__dot ${
						i === current ? "stepper__dot--active" : i < current ? "stepper__dot--done" : ""
					}`}
					title={labels?.[i]}
				/>
			))}
		</div>
	);
}

/* ---------------------------------- Progress --------------------------------- */

export function ProgressBar({ value, label }: { value: number; label?: string }) {
	const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
	return (
		<div className="stack" style={{ gap: 6 }}>
			{label && (
				<div className="row row--between tiny faint">
					<span>{label}</span>
					<span>{pct}%</span>
				</div>
			)}
			<div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
				<div className="progress__bar" style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}

/* ---------------------------------- Utilities -------------------------------- */

export function formatBytes(bytes: number): string {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
	const s = Math.max(0, Math.round(seconds));
	const m = Math.floor(s / 60);
	const r = s % 60;
	if (m === 0) return `${r}s`;
	return `${m}m ${String(r).padStart(2, "0")}s`;
}

export function relativeTime(ts: number): string {
	const diff = Date.now() - ts;
	const mins = Math.round(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(ts).toLocaleDateString();
}

export function useDocumentTitle(title: string) {
	useEffect(() => {
		document.title = `${title} · AI Vision Hub`;
	}, [title]);
}

export function useMemoized<T>(factory: () => T, deps: unknown[]): T {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(factory, deps);
}
