import { useState } from "react";
import { useStore } from "../lib/store";
import { Button, Field, Select, TextInput, useToast } from "../components/ui";
import { LogoMark } from "../components/Logo";
import { navigateTo } from "../lib/router";
import { LANGUAGES } from "../lib/scriptTools";
import type { AspectRatio } from "../lib/types";

const STEPS = ["Welcome", "Identity", "Defaults", "Ready"];

export default function Onboarding() {
	const { settings, updateSettings } = useStore();
	const toast = useToast();
	const [step, setStep] = useState(0);
	const [name, setName] = useState(settings.creatorName);
	const [lang, setLang] = useState(settings.defaultLanguage);
	const [ratio, setRatio] = useState<AspectRatio>(settings.defaultAspectRatio);

	const finish = () => {
		updateSettings({
			creatorName: name.trim(),
			defaultLanguage: lang,
			defaultAspectRatio: ratio,
			onboarded: true,
		});
		toast("Welcome to AI Vision Hub", "ok");
		navigateTo("/");
	};

	return (
		<div className="splash" style={{ alignItems: "flex-start", overflowY: "auto" }}>
			<div className="splash__inner" style={{ paddingTop: "10vh" }}>
				<LogoMark size={72} id="onb" />
				<h1 className="hero__title">AI VISION HUB</h1>
				<p className="hero__tag">Imagine It. Direct It. Bring It to Life.</p>

				<div className="card" style={{ width: "100%", maxWidth: 460, marginTop: 22 }}>
					<div className="row row--between" style={{ marginBottom: 12 }}>
						<span className="badge badge--violet">{STEPS[step]}</span>
						<span className="tiny faint">
							{step + 1} / {STEPS.length}
						</span>
					</div>

					{step === 0 && (
						<div className="stack">
							<h2 style={{ fontSize: "1.15rem" }}>Your local film studio</h2>
							<p className="muted small">
								Write scripts, keep characters consistent, plan scenes shot by shot,
								generate images, video, voice and translations, then assemble the
								final film — all from your phone.
							</p>
							<ul className="stack" style={{ gap: 8, paddingLeft: 18 }}>
								<li className="small muted">
									<b>Your data stays on this device.</b> Projects live in this browser.
								</li>
								<li className="small muted">
									AI features only work once you connect a provider — the app never
									fakes results.
								</li>
								<li className="small muted">
									No account required, no paid tier, no forced subscription.
								</li>
							</ul>
						</div>
					)}

					{step === 1 && (
						<div className="stack">
							<Field label="What should we call you?" hint="Used for the greeting on your home screen. Optional.">
								{(id) => (
									<TextInput
										id={id}
										value={name}
										placeholder="e.g. Elijah"
										onChange={(e) => setName(e.target.value)}
									/>
								)}
							</Field>
						</div>
					)}

					{step === 2 && (
						<div className="stack">
							<Field label="Default language" hint="Used for narration and translation defaults.">
								{(id) => (
									<Select id={id} value={lang} onChange={(e) => setLang(e.target.value)}>
										{LANGUAGES.map((l) => (
											<option key={l} value={l}>
												{l}
											</option>
										))}
									</Select>
								)}
							</Field>
							<Field label="Default aspect ratio">
								{(id) => (
									<Select
										id={id}
										value={ratio}
										onChange={(e) => setRatio(e.target.value as AspectRatio)}
									>
										<option value="16:9">16:9 — landscape (YouTube)</option>
										<option value="9:16">9:16 — vertical (Shorts, Reels)</option>
										<option value="1:1">1:1 — square</option>
										<option value="4:5">4:5 — portrait feed</option>
									</Select>
								)}
							</Field>
						</div>
					)}

					{step === 3 && (
						<div className="stack">
							<h2 style={{ fontSize: "1.15rem" }}>You are all set</h2>
							<p className="muted small">
								Next step: create your first film. The wizard walks you through format,
								style, characters and scenes. You can change everything later.
							</p>
							<div className="banner banner--warn">
								AI generation needs a provider. Open <b>Settings → AI providers</b> to
								connect one, or keep working offline and connect later.
							</div>
						</div>
					)}

					<div className="btn-row" style={{ marginTop: 18 }}>
						{step > 0 && (
							<Button variant="ghost" onClick={() => setStep((s) => s - 1)} block>
								Back
							</Button>
						)}
						{step < STEPS.length - 1 ? (
							<Button onClick={() => setStep((s) => s + 1)} block>
								Continue
							</Button>
						) : (
							<Button onClick={finish} block>
								Start creating
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
