/**
 * _index.tsx — Home / Authentication page
 *
 * Entry point for the Fire Risk Intelligence Platform.
 * Handles authentication state and clearly communicates access tiers:
 *
 *   PUBLIC (no login required)
 *     └── Education Hub  — lithium battery safety, SFRS guidance
 *
 *   AUTHENTICATED (login required)
 *     ├── Live Hazard Map — risk zones, markers, station locations
 *     └── Education Hub   — same as above
 *
 * Authentication is currently handled via a simple state toggle for the
 * demo. Replace the `handleLogin` function with a real API call when the
 * backend auth endpoint is ready.
 */

import type { Route } from "./+types/_index";
import { useState } from "react";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Fire Risk Intelligence Platform — Glasgow" },
		{ name: "description", content: "Fire risk dashboard for Glasgow. Login for full operational access or explore public safety education." },
	];
}

// ─── Static content ───────────────────────────────────────────────────────────

/** High-level platform capabilities shown in the overview section */
const PLATFORM_FEATURES = [
	{
		title: "LIVE HAZARD MAP",
		text:  "Risk zones ranked by composite score across Glasgow. Click any marker for full building-level hazard detail.",
		restricted: true,
	},
	{
		title: "LITHIUM RISK LAYERS",
		text:  "Filter e-bike density, EV chargers, stairwell charging reports, and chemical proximity scores.",
		restricted: true,
	},
	{
		title: "DECISION SUPPORT",
		text:  "Understand why a location is high risk before crews arrive — building type, age, occupancy, infrastructure gaps.",
		restricted: true,
	},
	{
		title: "SAFETY EDUCATION",
		text:  "SFRS-sourced lithium-ion battery safety guidance. Open to all — no login required.",
		restricted: false,
	},
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
	// Authentication state — replace with real session/token check in production
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	// Controlled form fields
	const [email,    setEmail]    = useState("");
	const [password, setPassword] = useState("");
	const [loginError, setLoginError] = useState("");

	/**
	 * Handles login form submission.
	 * TODO: replace with a real API call to the backend auth endpoint.
	 * For the demo, any non-empty email + password grants access.
	 */
	function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setLoginError("");

		if (!email.trim() || !password.trim()) {
			setLoginError("Please enter both your email and password.");
			return;
		}

		// Demo auth — swap this for a real POST /api/auth/login call
		setIsAuthenticated(true);
	}

	function handleLogout() {
		setIsAuthenticated(false);
		setEmail("");
		setPassword("");
	}

	return (
		<div className="min-h-screen overflow-x-hidden">

			{/* ── Top status banner ── */}
			<div className="bg-fire py-2 px-8 flex items-center justify-center" role="banner">
				<span className="ff-display font-mono text-[0.7rem] tracking-[0.2em] text-white">
					FIRE RISK PLATFORM · GLASGOW ·{" "}
					{isAuthenticated ? "AUTHENTICATED — FULL ACCESS" : "PUBLIC ACCESS — LOGIN FOR FULL ACCESS"}
				</span>
			</div>

			{/* ── Hero ── */}
			<section className="relative py-20 px-8 border-b border-line" aria-label="Platform overview">
				<div className="scanlines" aria-hidden="true" />

				<div className="relative max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">

					{/* Left — title + description */}
					<div>
						<div className="text-[3.2rem] mb-4 leading-none" aria-hidden="true"
							style={{ filter: "drop-shadow(0 0 20px rgba(192,57,43,0.6))" }}>
							🚒
						</div>

						<h1 className="ff-display text-[clamp(3.6rem,9vw,7.5rem)] leading-[0.9] text-fg-1 mb-5 hero-title">
							FIRE RISK<br />
							<span className="text-flame" style={{ WebkitTextStroke: "1px var(--color-fire)" }}>
								INTELLIGENCE
							</span><br />
							PLATFORM
						</h1>

						<p className="ff-body text-[1.08rem] font-light text-fg-3 leading-[1.8] max-w-[620px] mb-8">
							A tool for Scottish Fire &amp; Rescue Service crews to monitor operational
							risk across Glasgow. Surface lithium battery hazards, chemical exposure,
							older buildings, and access issues before arriving on scene.
						</p>

						<div className="flex flex-wrap gap-4">
							{isAuthenticated ? (
								<>
									<Link
										to="/hazard-map"
										className="ff-display inline-block text-xl tracking-[0.08em] py-4 px-8 bg-fire text-white no-underline transition-all duration-150 hover:bg-flame hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
									>
										OPEN HAZARD MAP
									</Link>
									<Link
										to="/education"
										className="ff-display inline-block text-xl tracking-[0.08em] py-4 px-8 bg-transparent text-fg-1 no-underline border border-line-mid transition-all duration-150 hover:bg-white/[0.04] hover:border-[#6b4a42] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
									>
										EDUCATION HUB
									</Link>
								</>
							) : (
								<>
									<a
										href="#login"
										className="ff-display inline-block text-xl tracking-[0.08em] py-4 px-8 bg-fire text-white no-underline transition-all duration-150 hover:bg-flame hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
									>
										LOGIN
									</a>
									<Link
										to="/education"
										className="ff-display inline-block text-xl tracking-[0.08em] py-4 px-8 bg-transparent text-fg-1 no-underline border border-line-mid transition-all duration-150 hover:bg-white/[0.04] hover:border-[#6b4a42] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
									>
										PUBLIC EDUCATION
									</Link>
								</>
							)}
						</div>
					</div>

					{/* Right — access status panel */}
					<div className="bg-surface-3 border border-line p-8 rise-in">
						{isAuthenticated ? (
							<>
								<p className="ff-display text-[0.9rem] text-green-700 tracking-[0.18em] mb-4">
									✓ AUTHENTICATED
								</p>
								<p className="ff-display text-[2rem] leading-none mb-4">
									FULL ACCESS GRANTED
								</p>
								<p className="ff-body text-fg-3 leading-[1.7] text-[0.95rem] mb-6">
									You have access to all platform features including the live hazard
									map, risk zone detail, and the education hub.
								</p>
								<button
									onClick={handleLogout}
									className="ff-display w-full text-base tracking-[0.08em] py-3 px-6 bg-transparent text-fg-3 border border-line cursor-pointer transition-all duration-150 hover:border-fire hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
								>
									SIGN OUT
								</button>
							</>
						) : (
							<>
								<p className="ff-display text-[0.9rem] text-fire tracking-[0.18em] mb-4">
									ACCESS OVERVIEW
								</p>
								<p className="ff-display text-[2rem] leading-none mb-4 text-fg-1">
									TWO ACCESS TIERS
								</p>
								<p className="ff-body text-fg-2 leading-[1.7] text-[0.95rem] mb-6">
									The platform has a public tier for education and a restricted tier
									for operational fire risk data. Login is required for map access.
								</p>
								<div
									className="border border-fire p-4 bg-fire/[0.06] animate-pulse-border"
									role="note"
								>
									<p className="ff-display text-fire text-xl mb-1">RESTRICTED DATA</p>
									<p className="ff-body text-fg-2 text-[0.92rem] leading-[1.6]">
										The live hazard map contains sensitive operational risk data.
										Access is limited to authorised SFRS personnel.
									</p>
								</div>
							</>
						)}
					</div>
				</div>
			</section>

			{/* ── Access tiers — shown only when not logged in ── */}
			{!isAuthenticated && (
				<section className="max-w-[1100px] mx-auto px-8 pt-16 pb-8" aria-label="Access tiers">
					<div className="flex items-baseline gap-4 mb-10">
						<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">01</span>
						<h2 className="ff-display text-5xl leading-none">WHAT YOU CAN ACCESS</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">

						{/* Public tier */}
						<div className="border border-line rounded-none p-7 bg-surface-3">
							<div className="flex items-center gap-3 mb-5">
								<span className="text-2xl">🌐</span>
								<div>
									<div className="ff-display text-green-700 text-sm tracking-widest">NO LOGIN REQUIRED</div>
									<h3 className="ff-display text-2xl text-fg-1">Public Access</h3>
								</div>
							</div>
							<p className="ff-body text-fg-3 leading-relaxed mb-5">
								Anyone can access the Education Hub. It contains lithium-ion battery
								safety guidance sourced directly from Scottish Fire &amp; Rescue Service —
								covering warning signs, safe charging, storage, and disposal.
							</p>
							<Link
								to="/education"
								className="ff-display inline-block text-base tracking-[0.08em] py-3 px-6 bg-transparent text-green-700 no-underline border border-green-600 transition-all duration-150 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
							>
								GO TO EDUCATION HUB →
							</Link>
						</div>

						{/* Authenticated tier */}
						<div className="border border-fire/40 rounded-none p-7 bg-fire/[0.04]">
							<div className="flex items-center gap-3 mb-5">
								<span className="text-2xl">🔒</span>
								<div>
									<div className="ff-display text-flame text-sm tracking-widest">LOGIN REQUIRED</div>
									<h3 className="ff-display text-2xl text-fg-1">Operational Access</h3>
								</div>
							</div>
							<p className="ff-body text-fg-3 leading-relaxed mb-5">
								Authenticated SFRS personnel can access the live hazard map — risk zones
								ranked by composite score, building-level hazard detail, fire station
								locations, and decision-support data for pre-incident planning.
							</p>
							<a
								href="#login"
								className="ff-display inline-block text-base tracking-[0.08em] py-3 px-6 bg-fire text-white no-underline transition-all duration-150 hover:bg-flame focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
							>
								LOGIN FOR MAP ACCESS →
							</a>
						</div>
					</div>
				</section>
			)}

			{/* ── Platform features ── */}
			<section
				id="features"
				className="max-w-[1100px] mx-auto px-8 pt-8 pb-8"
				aria-label="Platform features"
			>
				<div className="flex items-baseline gap-4 mb-10">
					<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">
						{isAuthenticated ? "01" : "02"}
					</span>
					<h2 className="ff-display text-5xl leading-none">PLATFORM CAPABILITIES</h2>
				</div>

				<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0 m-0" role="list">
					{PLATFORM_FEATURES.map((feature) => {
						// Features that require login are visually muted for unauthenticated users
						const inaccessible = feature.restricted && !isAuthenticated;

						return (
							<li
								key={feature.title}
								className={`p-6 border-l-[3px] transition-all duration-200 ${
									inaccessible
										? "bg-surface-3/50 border-line opacity-60"
										: "bg-fire/[0.04] border-fire hover:bg-fire/10 hover:border-glow"
								}`}
								role="listitem"
							>
								{/* Lock badge for restricted features when not authenticated */}
								<div className="flex items-center justify-between mb-2">
									<p className="ff-display text-2xl text-fg-1">{feature.title}</p>
									{inaccessible && (
										<span className="ff-display text-[0.6rem] tracking-widest text-fg-3 border border-line px-2 py-0.5">
											LOGIN
										</span>
									)}
									{!feature.restricted && (
										<span className="ff-display text-[0.6rem] tracking-widest text-green-700 border border-green-600 px-2 py-0.5">
											PUBLIC
										</span>
									)}
								</div>
								<p className="ff-body text-[0.95rem] text-fg-3 leading-[1.7]">{feature.text}</p>
							</li>
						);
					})}
				</ul>
			</section>

			{/* ── Login form — hidden when already authenticated ── */}
			{!isAuthenticated && (
				<>
					{/* Flame divider */}
					<div className="max-w-[1100px] mx-auto px-8" aria-hidden="true">
						<div className="flex items-center gap-4 my-8">
							<div className="flex-1 h-px bg-gradient-to-r from-transparent to-fire" />
							<span className="ff-display text-[0.7rem] text-fire tracking-[0.2em] whitespace-nowrap">
								SECURE ACCESS
							</span>
							<div className="flex-1 h-px bg-gradient-to-l from-transparent to-fire" />
						</div>
					</div>

					<section
						id="login"
						className="max-w-[1100px] mx-auto px-8 pb-20"
						aria-label="Login"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

							{/* Login form */}
							<div className="bg-surface-3 border border-line p-8">
								<div className="flex items-baseline gap-4 mb-6">
									<span className="ff-display text-[0.75rem] text-amber tracking-[0.2em]" aria-hidden="true">03</span>
									<h2 className="ff-display text-5xl leading-none">LOGIN</h2>
								</div>

								<p className="ff-body text-fg-3 leading-[1.7] text-[0.95rem] mb-6">
									Sign in with your SFRS credentials to access the live hazard map
									and full operational risk data.
								</p>

								<form
									className="grid gap-4"
									onSubmit={handleLogin}
									aria-label="Sign in form"
									noValidate
								>
									<div className="grid gap-[0.45rem]">
										<label htmlFor="email" className="ff-display text-base text-fg-2">EMAIL</label>
										<input
											id="email"
											type="email"
											placeholder="name@firescotland.gov.uk"
											autoComplete="email"
											required
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="ff-body w-full bg-surface-1 text-fg-1 border border-line-warm px-4 py-4 text-base placeholder:text-fg-3 outline-none transition-all duration-150 focus:border-fire focus:shadow-[0_0_0_1px_var(--color-fire)] focus-visible:ring-2 focus-visible:ring-glow focus-visible:ring-offset-1 focus-visible:ring-offset-surface-3"
										/>
									</div>

									<div className="grid gap-[0.45rem]">
										<label htmlFor="password" className="ff-display text-base text-fg-2">PASSWORD</label>
										<input
											id="password"
											type="password"
											placeholder="Enter password"
											autoComplete="current-password"
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="ff-body w-full bg-surface-1 text-fg-1 border border-line-warm px-4 py-4 text-base placeholder:text-fg-3 outline-none transition-all duration-150 focus:border-fire focus:shadow-[0_0_0_1px_var(--color-fire)] focus-visible:ring-2 focus-visible:ring-glow focus-visible:ring-offset-1 focus-visible:ring-offset-surface-3"
										/>
									</div>

									{/* Error message */}
									{loginError && (
										<p className="ff-body text-red-700 text-sm" role="alert">{loginError}</p>
									)}

									<div className="flex justify-between items-center gap-4 flex-wrap">
										<label className="ff-body flex items-center gap-2 text-[0.9rem] text-fg-3 cursor-pointer">
											<input type="checkbox" className="w-4 h-4 cursor-pointer accent-fire" />
											Keep me signed in
										</label>
										<a
											href="#"
											className="ff-body text-[0.9rem] text-link no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow rounded-sm"
										>
											Forgot password?
										</a>
									</div>

									<button
										type="submit"
										className="ff-display w-full mt-2 text-xl tracking-[0.08em] py-4 px-8 bg-fire text-white border-none cursor-pointer transition-all duration-150 hover:bg-flame hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
									>
										ACCESS DASHBOARD
									</button>
								</form>
							</div>

							{/* What you get after login */}
							<div className="bg-surface-3 border border-line p-8 flex flex-col gap-6">
								<div>
									<p className="ff-display text-[0.9rem] text-flame tracking-[0.18em] mb-4">
										AFTER LOGIN
									</p>
									<h3 className="ff-display text-3xl text-fg-1 mb-4">What You'll Have Access To</h3>

									<ul className="grid gap-3 list-none p-0 m-0">
										{[
											{ icon: "🗺️", label: "Live Hazard Map", detail: "All Glasgow risk zones with full detail panels" },
											{ icon: "🔋", label: "Lithium Risk Data", detail: "E-bike density, charger locations, stairwell reports" },
											{ icon: "🏢", label: "Building Profiles", detail: "Type, age, floors, shared stairwells, access rating" },
											{ icon: "📚", label: "Education Hub",    detail: "SFRS safety guidance — also accessible without login" },
										].map(({ icon, label, detail }) => (
											<li key={label} className="flex items-start gap-3 px-4 py-3 border border-line bg-surface-2">
												<span className="text-xl shrink-0">{icon}</span>
												<div>
													<p className="ff-display text-base text-fg-1">{label}</p>
													<p className="ff-body text-sm text-fg-3">{detail}</p>
												</div>
											</li>
										))}
									</ul>
								</div>

								{/* Public access reminder */}
								<div className="border border-green-300 p-4 bg-green-50">
									<p className="ff-display text-green-700 text-sm tracking-widest mb-1">
										🌐 NO LOGIN NEEDED
									</p>
									<p className="ff-body text-fg-3 text-[0.92rem] leading-[1.6]">
										The Education Hub is publicly available.{" "}
										<Link
											to="/education"
											className="text-green-700 no-underline hover:underline"
										>
											Go to Education Hub →
										</Link>
									</p>
								</div>
							</div>
						</div>
					</section>
				</>
			)}

			{/* ── Authenticated dashboard links ── */}
			{isAuthenticated && (
				<section className="max-w-[1100px] mx-auto px-8 pb-20 pt-8" aria-label="Dashboard navigation">
					<div className="flex items-baseline gap-4 mb-8">
						<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">02</span>
						<h2 className="ff-display text-5xl leading-none">YOUR DASHBOARD</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Link
							to="/hazard-map"
							className="group bg-fire/[0.04] border border-fire/40 p-8 no-underline transition-all duration-200 hover:bg-fire/10 hover:border-fire"
						>
							<div className="text-3xl mb-4">🗺️</div>
							<p className="ff-display text-flame text-sm tracking-widest mb-2">OPERATIONAL</p>
							<h3 className="ff-display text-3xl text-fg-1 mb-3">Live Hazard Map</h3>
							<p className="ff-body text-fg-3 leading-relaxed text-sm mb-4">
								Glasgow risk zones ranked by composite score. Click any marker for
								full building-level hazard detail including lithium sources, building
								vulnerability, human risk, and fire infrastructure.
							</p>
							<span className="ff-display text-flame text-sm tracking-widest group-hover:text-glow transition-colors">
								OPEN MAP →
							</span>
						</Link>

						<Link
							to="/education"
							className="group bg-surface-3 border border-line p-8 no-underline transition-all duration-200 hover:border-flame/30"
						>
							<div className="text-3xl mb-4">📚</div>
							<p className="ff-display text-green-700 text-sm tracking-widest mb-2">PUBLIC + AUTHENTICATED</p>
							<h3 className="ff-display text-3xl text-fg-1 mb-3">Education Hub</h3>
							<p className="ff-body text-fg-3 leading-relaxed text-sm mb-4">
								Lithium-ion battery safety guidance from Scottish Fire &amp; Rescue Service.
								Covers warning signs, safe charging, storage, emergency response,
								and disposal. Open to all — no login required.
							</p>
							<span className="ff-display text-flame text-sm tracking-widest group-hover:text-glow transition-colors">
								VIEW GUIDANCE →
							</span>
						</Link>
					</div>
				</section>
			)}

			{/* ── Footer ── */}
			<footer className="border-t border-[#1a1a1a] py-8 px-8 text-center">
				<p className="ff-body text-[0.8rem] text-fg-3 tracking-[0.1em]">
					FIRE RISK INTELLIGENCE · GLASGOW ·{" "}
					{isAuthenticated ? "AUTHENTICATED SESSION ACTIVE" : "LOGIN FOR FULL ACCESS"}
				</p>
			</footer>
		</div>
	);
}
