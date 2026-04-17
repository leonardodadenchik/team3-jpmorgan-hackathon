import type { Route } from "./+types/_index";
import { useState } from "react";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "FireOps Intelligence — Glasgow Fire Risk Command" },
		{ name: "description", content: "Real-time fire risk intelligence for Scottish Fire & Rescue Service. Hazard mapping, AI fire simulation, and weather-aware risk scoring for Glasgow." },
	];
}

// ─── Static content ────────────────────────────────────────────────────────────

const HAZARD_FACTORS = [
	{
		icon: "🧪",
		tag:  "CHEMICAL HAZARDS",
		title: "Chemical Proximity",
		body:  "Identifies nearby chemical storage, industrial sites, and hazardous material locations. Crews are alerted to toxic exposure risk and required PPE before arriving on scene.",
	},
	{
		icon: "🔋",
		tag:  "LITHIUM RISK",
		title: "Lithium Batteries",
		body:  "E-bike density, EV charger locations, stairwell charging reports, and battery storage density. Lithium fires burn hotter and resist water — knowing they're present changes your approach entirely.",
	},
	{
		icon: "🚒",
		tag:  "INFRASTRUCTURE",
		title: "Station Proximity",
		body:  "Response time estimates based on nearest fire station locations, road network, and time of day. High-risk zones far from stations get elevated composite scores.",
	},
	{
		icon: "🏚️",
		tag:  "STRUCTURAL RISK",
		title: "Building Age & Type",
		body:  "Older buildings lack modern fire suppression, use outdated materials, and have narrower escape routes. Building age, type, number of floors, and shared stairwells are all factored into the risk model.",
	},
	{
		icon: "👴",
		tag:  "VULNERABLE OCCUPANTS",
		title: "Elderly Residents",
		body:  "Areas with higher concentrations of elderly residents carry elevated risk — slower evacuation, medical complications, and higher dependency on rescue. The platform flags these zones for tactical awareness.",
	},
	{
		icon: "♿",
		tag:  "VULNERABLE OCCUPANTS",
		title: "Disabled Persons",
		body:  "Buildings with known disabled occupants require adapted rescue planning. Access ratings, lift availability, and mobility aid dependencies are surfaced in the hazard detail panel.",
	},
];

const INTELLIGENCE_FEATURES = [
	{
		icon: "🌦️",
		title: "Real-Time Weather Integration",
		body:  "Live weather data feeds directly into the risk engine. Wind speed and direction affect fire spread. Low humidity accelerates ignition. Temperature inversions trap smoke. The platform pulls current conditions and factors them into every risk score — automatically.",
	},
	{
		icon: "🕐",
		title: "Time-of-Day Risk Prediction",
		body:  "Risk isn't static. A building scores differently at 3am — when residents are asleep and response times are slower — versus 3pm. The platform models occupancy patterns, road congestion, and visibility conditions to give you a time-aware risk picture.",
	},
	{
		icon: "🤖",
		title: "AI Fire Spread Simulation",
		body:  "Tell the AI where a fire starts and it simulates how it spreads — factoring in building layout, wind, materials, and nearby hazards. Use it to pre-plan attack routes, predict which adjacent properties are at risk, and brief your crew before you arrive.",
	},
];

const AFTER_LOGIN_ITEMS = [
	{ icon: "🗺️", label: "Live Hazard Map",        detail: "All Glasgow risk zones with full detail panels and composite scores" },
	{ icon: "🤖", label: "AI Fire Simulation",      detail: "Simulate fire spread from any point, factoring weather and materials" },
	{ icon: "🧪", label: "Chemical & Battery Risk", detail: "Overlay chemical proximity, e-bike density, and stairwell charging reports" },
	{ icon: "🏚️", label: "Building Profiles",       detail: "Age, type, floors, stairwells, access rating, vulnerable occupant flags" },
	{ icon: "🌦️", label: "Weather-Aware Scoring",  detail: "Risk scores that update with live weather and time of day" },
	{ icon: "📚", label: "Education Hub",           detail: "SFRS safety guidance — also accessible without login" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [email,    setEmail]    = useState("");
	const [password, setPassword] = useState("");
	const [loginError, setLoginError] = useState("");

	function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setLoginError("");
		if (!email.trim() || !password.trim()) {
			setLoginError("Please enter both your email and password.");
			return;
		}
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
					FIREOPS INTELLIGENCE · GLASGOW ·{" "}
					{isAuthenticated ? "AUTHENTICATED — FULL ACCESS" : "PUBLIC ACCESS — LOGIN FOR FULL OPERATIONAL ACCESS"}
				</span>
			</div>

			{/* ── Hero ── */}
			<section className="relative py-20 px-8 border-b border-line" aria-label="Platform overview">
				<div className="scanlines" aria-hidden="true" />

				<div className="relative max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">

					{/* Left — headline + value prop */}
					<div>
						<div className="text-[3.2rem] mb-4 leading-none" aria-hidden="true"
							style={{ filter: "drop-shadow(0 0 20px rgba(192,57,43,0.6))" }}>
							🚒
						</div>

						<h1 className="ff-display text-[clamp(3.2rem,8vw,6.8rem)] leading-[0.92] text-fg-1 mb-5 hero-title">
							WHEN FIRE<br />
							<span className="text-flame" style={{ WebkitTextStroke: "1px var(--color-fire)" }}>
								BREAKS OUT,
							</span><br />
							KNOW BEFORE<br />YOU ARRIVE.
						</h1>

						<p className="ff-body text-[1.1rem] font-light text-fg-3 leading-[1.85] max-w-[640px] mb-3">
							FireOps Intelligence gives Scottish Fire &amp; Rescue Service crews a complete
							pre-incident picture of any location in Glasgow — in seconds.
						</p>
						<p className="ff-body text-[1.1rem] font-light text-fg-3 leading-[1.85] max-w-[640px] mb-8">
							Chemical hazards. Lithium battery density. Building age and structure.
							Vulnerable residents. Weather conditions. Station response times. All
							synthesised into a single risk score — updated in real time.
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
										LOGIN FOR FULL ACCESS
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
									You have full access to the live hazard map, AI fire simulation,
									weather-aware risk scoring, and the education hub.
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
								<p className="ff-display text-[0.9rem] text-fire tracking-[0.18em] mb-3">
									BUILT FOR SFRS CREWS
								</p>
								<p className="ff-display text-[1.75rem] leading-tight mb-4 text-fg-1">
									INTELLIGENCE THAT CHANGES HOW YOU RESPOND
								</p>
								<p className="ff-body text-fg-2 leading-[1.7] text-[0.93rem] mb-5">
									Every incident carries unknowns. FireOps eliminates as many as possible
									before your crew reaches the door. Login is required to access live
									operational data.
								</p>
								<div
									className="border border-fire p-4 bg-fire/[0.06] animate-pulse-border"
									role="note"
								>
									<p className="ff-display text-fire text-lg mb-1">RESTRICTED OPERATIONAL DATA</p>
									<p className="ff-body text-fg-2 text-[0.9rem] leading-[1.6]">
										The hazard map and AI simulation contain sensitive risk data. Access
										is limited to authorised SFRS personnel.
									</p>
								</div>
							</>
						)}
					</div>
				</div>
			</section>

			{/* ── Why firefighters need this ── */}
			<section className="bg-fire/[0.03] border-b border-line py-16 px-8" aria-label="Why firefighters need this">
				<div className="max-w-[1100px] mx-auto">
					<div className="flex items-baseline gap-4 mb-4">
						<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">01</span>
						<h2 className="ff-display text-5xl leading-none">WHY THIS EXISTS</h2>
					</div>
					<p className="ff-body text-fg-3 text-lg leading-[1.85] max-w-[820px] mb-10">
						When a fire call comes in, crews have minutes — sometimes seconds — to make decisions
						that affect lives. The building you're entering might contain lithium batteries that
						explode with water. The corridor might be blocked by an e-scooter. An elderly resident
						on the third floor may be unable to evacuate. A chemical store around the corner could
						escalate rapidly.
					</p>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[
							{
								icon: "⏱️",
								title: "Seconds, Not Minutes",
								body:  "Pre-incident intelligence means your crew arrives with a plan, not questions. Every second spent discovering hazards on-scene is a second not spent saving lives.",
							},
							{
								icon: "🧠",
								title: "Reduce the Unknowns",
								body:  "The platform surfaces what CAD systems don't — vulnerable occupants, hazardous materials, structural risk, and access constraints — before you breach the door.",
							},
							{
								icon: "📡",
								title: "Live, Not Static",
								body:  "Risk changes with weather, time of day, and new intelligence. FireOps updates continuously so what you see reflects conditions right now — not last week.",
							},
						].map(({ icon, title, body }) => (
							<div key={title} className="bg-base border border-line p-6">
								<div className="text-3xl mb-4">{icon}</div>
								<h3 className="ff-display text-2xl text-fg-1 mb-3">{title}</h3>
								<p className="ff-body text-fg-3 leading-[1.75] text-[0.95rem]">{body}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Hazard factors ── */}
			<section className="py-16 px-8 border-b border-line" aria-label="Hazard factors">
				<div className="max-w-[1100px] mx-auto">
					<div className="flex items-baseline gap-4 mb-4">
						<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">02</span>
						<h2 className="ff-display text-5xl leading-none">WHAT WE TRACK</h2>
					</div>
					<p className="ff-body text-fg-3 text-lg leading-[1.85] max-w-[700px] mb-10">
						FireOps synthesises six categories of hazard data into a single composite risk score
						for every location in Glasgow. Here's what goes into it.
					</p>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{HAZARD_FACTORS.map((factor) => (
							<div
								key={factor.title}
								className="bg-surface-3 border-l-[3px] border-fire p-6 hover:bg-fire/[0.04] transition-colors duration-200"
							>
								<div className="text-3xl mb-3">{factor.icon}</div>
								<div className="ff-display text-[0.65rem] text-flame tracking-[0.2em] mb-1">{factor.tag}</div>
								<h3 className="ff-display text-2xl text-fg-1 mb-3">{factor.title}</h3>
								<p className="ff-body text-fg-3 leading-[1.75] text-[0.92rem]">{factor.body}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Intelligence features (weather, time, AI) ── */}
			<section className="bg-fire/[0.03] border-b border-line py-16 px-8" aria-label="Platform intelligence">
				<div className="max-w-[1100px] mx-auto">
					<div className="flex items-baseline gap-4 mb-4">
						<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">03</span>
						<h2 className="ff-display text-5xl leading-none">INTELLIGENT RISK ENGINE</h2>
					</div>
					<p className="ff-body text-fg-3 text-lg leading-[1.85] max-w-[700px] mb-10">
						Static hazard data only tells half the story. FireOps layers live conditions on
						top — so risk scores reflect what's happening right now, not just what's on the map.
					</p>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{INTELLIGENCE_FEATURES.map((feature) => (
							<div
								key={feature.title}
								className="bg-base border border-line p-7 flex flex-col gap-4"
							>
								<div className="text-4xl">{feature.icon}</div>
								<h3 className="ff-display text-2xl text-fg-1 leading-tight">{feature.title}</h3>
								<p className="ff-body text-fg-3 leading-[1.8] text-[0.93rem] flex-1">{feature.body}</p>
							</div>
						))}
					</div>

					{/* AI simulation callout */}
					<div className="mt-8 border border-fire/40 bg-fire/[0.04] p-8">
						<div className="flex flex-col lg:flex-row gap-6 items-start">
							<div className="text-5xl shrink-0">🤖</div>
							<div>
								<div className="ff-display text-flame text-sm tracking-widest mb-2">AI SIMULATION</div>
								<h3 className="ff-display text-3xl text-fg-1 mb-4">
									Simulate the Fire Before You Arrive
								</h3>
								<p className="ff-body text-fg-2 leading-[1.8] max-w-[700px] mb-4">
									Select any point on the hazard map and run an AI-powered fire spread
									simulation. The model factors in current wind speed and direction, building
									materials, structural layout, lithium battery locations, and chemical
									proximity to show you how a fire would likely behave.
								</p>
								<p className="ff-body text-fg-3 leading-[1.8] max-w-[700px] text-[0.93rem]">
									Use it to identify secondary ignition risks, plan attack routes, determine
									which adjacent properties are in the fire's path, and brief your crew on
									expected fire behaviour — all before you set foot on the scene.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ── Access tiers (unauthenticated only) ── */}
			{!isAuthenticated && (
				<section className="max-w-[1100px] mx-auto px-8 pt-16 pb-8" aria-label="Access tiers">
					<div className="flex items-baseline gap-4 mb-10">
						<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">04</span>
						<h2 className="ff-display text-5xl leading-none">ACCESS TIERS</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="border border-line p-7 bg-surface-3">
							<div className="flex items-center gap-3 mb-5">
								<span className="text-2xl">🌐</span>
								<div>
									<div className="ff-display text-green-700 text-sm tracking-widest">NO LOGIN REQUIRED</div>
									<h3 className="ff-display text-2xl text-fg-1">Public Access</h3>
								</div>
							</div>
							<p className="ff-body text-fg-3 leading-relaxed mb-5">
								The Education Hub is open to everyone. It contains lithium-ion battery safety
								guidance sourced directly from Scottish Fire &amp; Rescue Service — covering
								warning signs, safe charging, storage, and disposal.
							</p>
							<Link
								to="/education"
								className="ff-display inline-block text-base tracking-[0.08em] py-3 px-6 bg-transparent text-green-700 no-underline border border-green-600 transition-all duration-150 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
							>
								GO TO EDUCATION HUB →
							</Link>
						</div>

						<div className="border border-fire/40 p-7 bg-fire/[0.04]">
							<div className="flex items-center gap-3 mb-5">
								<span className="text-2xl">🔒</span>
								<div>
									<div className="ff-display text-flame text-sm tracking-widest">LOGIN REQUIRED</div>
									<h3 className="ff-display text-2xl text-fg-1">Operational Access</h3>
								</div>
							</div>
							<p className="ff-body text-fg-3 leading-relaxed mb-5">
								Authenticated SFRS personnel access the full platform — live hazard map,
								AI fire simulation, weather-aware risk scoring, vulnerable occupant data,
								and complete building hazard profiles.
							</p>
							<a
								href="#login"
								className="ff-display inline-block text-base tracking-[0.08em] py-3 px-6 bg-fire text-white no-underline transition-all duration-150 hover:bg-flame focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-glow"
							>
								LOGIN FOR FULL ACCESS →
							</a>
						</div>
					</div>
				</section>
			)}

			{/* ── Login form ── */}
			{!isAuthenticated && (
				<>
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
									<span className="ff-display text-[0.75rem] text-amber tracking-[0.2em]" aria-hidden="true">05</span>
									<h2 className="ff-display text-5xl leading-none">LOGIN</h2>
								</div>
								<p className="ff-body text-fg-3 leading-[1.7] text-[0.95rem] mb-6">
									Sign in with your SFRS credentials to access the live hazard map,
									AI fire simulation, and full operational risk data.
								</p>

								<form className="grid gap-4" onSubmit={handleLogin} aria-label="Sign in form" noValidate>
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
										ACCESS FIREOPS DASHBOARD
									</button>
								</form>
							</div>

							{/* What you get */}
							<div className="bg-surface-3 border border-line p-8 flex flex-col gap-5">
								<div>
									<p className="ff-display text-[0.9rem] text-flame tracking-[0.18em] mb-4">
										AFTER LOGIN
									</p>
									<h3 className="ff-display text-3xl text-fg-1 mb-4">Full Operational Intelligence</h3>

									<ul className="grid gap-3 list-none p-0 m-0">
										{AFTER_LOGIN_ITEMS.map(({ icon, label, detail }) => (
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

								<div className="border border-green-300 p-4 bg-green-50 mt-auto">
									<p className="ff-display text-green-700 text-sm tracking-widest mb-1">
										🌐 NO LOGIN NEEDED
									</p>
									<p className="ff-body text-fg-3 text-[0.92rem] leading-[1.6]">
										The Education Hub is publicly available.{" "}
										<Link to="/education" className="text-green-700 no-underline hover:underline">
											Go to Education Hub →
										</Link>
									</p>
								</div>
							</div>
						</div>
					</section>
				</>
			)}

			{/* ── Authenticated dashboard ── */}
			{isAuthenticated && (
				<section className="max-w-[1100px] mx-auto px-8 pb-20 pt-12" aria-label="Dashboard navigation">
					<div className="flex items-baseline gap-4 mb-8">
						<span className="ff-display text-[0.75rem] text-flame tracking-[0.2em]" aria-hidden="true">04</span>
						<h2 className="ff-display text-5xl leading-none">YOUR DASHBOARD</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Link
							to="/hazard-map"
							className="group bg-fire/[0.04] border border-fire/40 p-8 no-underline transition-all duration-200 hover:bg-fire/10 hover:border-fire"
						>
							<div className="text-3xl mb-4">🗺️</div>
							<p className="ff-display text-flame text-sm tracking-widest mb-2">OPERATIONAL · LIVE</p>
							<h3 className="ff-display text-3xl text-fg-1 mb-3">Live Hazard Map</h3>
							<p className="ff-body text-fg-3 leading-relaxed text-sm mb-4">
								Glasgow risk zones with composite scores. Click any location for full
								hazard detail — chemicals, lithium risk, building profile, vulnerable
								occupants, station proximity, and AI fire simulation.
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
					FIREOPS INTELLIGENCE · GLASGOW · SCOTTISH FIRE &amp; RESCUE SERVICE ·{" "}
					{isAuthenticated ? "AUTHENTICATED SESSION ACTIVE" : "LOGIN FOR FULL ACCESS"}
				</p>
			</footer>
		</div>
	);
}
