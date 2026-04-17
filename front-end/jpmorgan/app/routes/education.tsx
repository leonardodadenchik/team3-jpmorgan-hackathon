/**
 * education.tsx
 *
 * Education hub for FireOps. Contains training module links and a detailed
 * lithium-ion battery safety guide sourced from Scottish Fire & Rescue Service.
 *
 * Source: https://www.firescotland.gov.uk/at-home/lithium-ion-batteries/
 */

import type { Route } from "./+types/education";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Education | FireOps" },
		{ name: "description", content: "Professional development for firefighters and first responders." },
	];
}

// ─── Training module cards ────────────────────────────────────────────────────

const TRAINING_CARDS = [
	{
		tag: "MODULES",
		title: "Training Courses",
		body: "Access structured learning modules with certifications, quizzes, and practical scenarios.",
		cta: "Browse All Modules →",
		href: "/training",
		asLink: true,
	},
	{
		tag: "RESOURCES",
		title: "Knowledge Base",
		body: "SOPs, hazard guides, after-action reports, and tactical manuals.",
		cta: "Explore Resources →",
		href: undefined,
		asLink: false,
	},
] as const;

// ─── Lithium-ion battery safety content ──────────────────────────────────────
// All content sourced from Scottish Fire & Rescue Service:
// https://www.firescotland.gov.uk/at-home/lithium-ion-batteries/

/** Warning signs that a lithium-ion battery is damaged or failing */
const BATTERY_WARNING_SIGNS = [
	{ icon: "💨", text: "Producing smoke" },
	{ icon: "🔥", text: "Feeling extremely hot to the touch" },
	{ icon: "🫧", text: "Appearing swollen, lumpy, or leaking" },
	{ icon: "🔊", text: "Making hissing or cracking sounds" },
	{ icon: "👃", text: "Emitting unusual or acrid odours" },
	{ icon: "🔋", text: "Taking longer to charge or failing to fully charge" },
];

/** Safe charging practices recommended by SFRS */
const CHARGING_TIPS = [
	"Never charge a device while you are asleep or away from home.",
	"Do not charge devices in hallways, stairwells, or any escape route.",
	"Only use the charger supplied by the manufacturer, or a certified replacement.",
	"Never cover a charger or device while it is charging.",
	"Keep charging devices away from flammable materials such as bedding or sofas.",
	"Unplug the charger as soon as the device is fully charged.",
];

/** Safe storage practices recommended by SFRS */
const STORAGE_TIPS = [
	"Store batteries and devices in a cool, dry location — avoid direct sunlight and heat sources.",
	"Never store e-bikes, e-scooters, or hoverboards in hallways, stairwells, or escape routes.",
	"Keep devices away from extreme cold, which can also degrade battery performance.",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Education() {
	return (
		<div className="min-h-screen bg-base text-fg-1 p-8">
			<div className="max-w-5xl mx-auto">

				{/* Back navigation */}
				<Link
					to="/"
					className="ff-body inline-flex items-center gap-2 text-fg-3 hover:text-flame transition-colors duration-150 mb-8 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow rounded-sm"
				>
					← Back to Home
				</Link>

				{/* Page header */}
				<div className="mb-12">
					<h1 className="ff-display text-6xl tracking-tight text-flame mb-4">
						FIREOPS EDUCATION HUB
					</h1>
					<p className="ff-body text-fg-3 text-xl max-w-2xl leading-relaxed">
						Professional development for firefighters and first responders.
						Knowledge that saves lives.
					</p>
				</div>

				{/* Training module cards */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
					{TRAINING_CARDS.map((card) => (
						<div
							key={card.tag}
							className="bg-surface-3 border border-line rounded-2xl p-8 hover:border-flame/30 transition-colors duration-200"
						>
							<div className="ff-display text-flame text-sm tracking-widest mb-3">{card.tag}</div>
							<h2 className="ff-display text-3xl text-fg-1 mb-4">{card.title}</h2>
							<p className="ff-body text-fg-3 mb-6 leading-relaxed">{card.body}</p>

							{card.asLink ? (
								<Link
									to={card.href}
									className="ff-body text-flame hover:text-glow font-medium flex items-center gap-2 no-underline transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow rounded-sm"
								>
									{card.cta}
								</Link>
							) : (
								<button className="ff-body text-flame hover:text-glow font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow rounded-sm cursor-pointer bg-transparent border-none p-0">
									{card.cta}
								</button>
							)}
						</div>
					))}
				</div>

				{/* ── Lithium-Ion Battery Safety Guide ── */}
				<section aria-labelledby="lithium-guide-heading">

					{/* Section header */}
					<div className="flex items-center gap-4 mb-2">
						<div className="ff-display text-flame text-sm tracking-widest">SFRS GUIDANCE</div>
					</div>
					<h2 id="lithium-guide-heading" className="ff-display text-4xl text-fg-1 mb-3">
						LITHIUM-ION BATTERY SAFETY
					</h2>
					<p className="ff-body text-fg-3 text-lg max-w-3xl leading-relaxed mb-10">
						Lithium-ion batteries are found in mobile phones, laptops, vapes, e-bikes, e-scooters,
						and hoverboards. The ferocity of a fire caused by a lithium-ion battery can be
						significant and may prevent escape from a building. The guidance below is sourced
						directly from Scottish Fire &amp; Rescue Service.
					</p>

					{/* Overview + Emergency response — two columns */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

						{/* Why it matters */}
						<div className="bg-surface-3 border border-line rounded-2xl p-7">
							<div className="ff-display text-flame text-sm tracking-widest mb-3">WHY IT MATTERS</div>
							<h3 className="ff-display text-2xl text-fg-1 mb-4">The Risk</h3>
							<p className="ff-body text-fg-3 leading-relaxed mb-3">
								Lithium-ion battery fires burn extremely hot and fast, producing toxic gases.
								Thermal runaway — a self-sustaining chain reaction inside the battery — can
								cause a device to ignite within seconds.
							</p>
							<p className="ff-body text-fg-3 leading-relaxed">
								E-bikes and e-scooters stored or charged in hallways and stairwells are
								especially dangerous because they block the only escape route from a building.
							</p>
						</div>

						{/* Emergency response — red-tinted to signal urgency */}
						<div className="bg-red-50 border border-red-200 rounded-2xl p-7">
							<div className="ff-display text-red-700 text-sm tracking-widest mb-3">🚨 EMERGENCY</div>
							<h3 className="ff-display text-2xl text-fg-1 mb-4">If a Fire Starts</h3>
							<p className="ff-body text-fg-3 leading-relaxed mb-4">
								If you see flames or smoke coming from a battery or device, a fire has already
								started. As with all fires:
							</p>
							<ol className="ff-body text-fg-2 space-y-2 list-none">
								<li className="flex items-center gap-3">
									<span className="ff-display text-red-700 text-lg font-bold w-6 shrink-0">1</span>
									<span><strong>Get out</strong> of the building immediately.</span>
								</li>
								<li className="flex items-center gap-3">
									<span className="ff-display text-red-700 text-lg font-bold w-6 shrink-0">2</span>
									<span><strong>Stay out</strong> — do not re-enter for any reason.</span>
								</li>
								<li className="flex items-center gap-3">
									<span className="ff-display text-red-700 text-lg font-bold w-6 shrink-0">3</span>
									<span><strong>Call 999</strong> — do not attempt to fight the fire yourself.</span>
								</li>
							</ol>
						</div>
					</div>

					{/* Warning signs */}
					<div className="bg-surface-3 border border-line rounded-2xl p-7 mb-6">
						<div className="ff-display text-flame text-sm tracking-widest mb-3">IDENTIFICATION</div>
						<h3 className="ff-display text-2xl text-fg-1 mb-2">Warning Signs of a Failing Battery</h3>
						<p className="ff-body text-fg-3 mb-6">
							Do not use or charge a device if the battery shows any of the following signs.
							Remove it from any escape route and contact the manufacturer.
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{BATTERY_WARNING_SIGNS.map(({ icon, text }) => (
								<div
									key={text}
									className="flex items-start gap-3 bg-base border border-line rounded-xl p-4"
								>
									<span className="text-2xl shrink-0">{icon}</span>
									<span className="ff-body text-fg-2 text-sm leading-snug">{text}</span>
								</div>
							))}
						</div>
					</div>

					{/* Charging + Storage — two columns */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

						{/* Charging best practices */}
						<div className="bg-surface-3 border border-line rounded-2xl p-7">
							<div className="ff-display text-flame text-sm tracking-widest mb-3">PREVENTION</div>
							<h3 className="ff-display text-2xl text-fg-1 mb-5">Safe Charging</h3>
							<ul className="space-y-3">
								{CHARGING_TIPS.map((tip) => (
									<li key={tip} className="flex items-start gap-3">
										<span className="text-flame mt-0.5 shrink-0 text-lg leading-none">✓</span>
										<span className="ff-body text-fg-3 leading-relaxed text-sm">{tip}</span>
									</li>
								))}
							</ul>
						</div>

						{/* Storage guidelines */}
						<div className="bg-surface-3 border border-line rounded-2xl p-7">
							<div className="ff-display text-flame text-sm tracking-widest mb-3">PREVENTION</div>
							<h3 className="ff-display text-2xl text-fg-1 mb-5">Safe Storage</h3>
							<ul className="space-y-3 mb-6">
								{STORAGE_TIPS.map((tip) => (
									<li key={tip} className="flex items-start gap-3">
										<span className="text-flame mt-0.5 shrink-0 text-lg leading-none">✓</span>
										<span className="ff-body text-fg-3 leading-relaxed text-sm">{tip}</span>
									</li>
								))}
							</ul>

							{/* Disposal — tucked into the storage card as it's related */}
							<div className="border-t border-line pt-5">
								<div className="ff-display text-flame text-sm tracking-widest mb-2">DISPOSAL</div>
								<h4 className="ff-display text-lg text-fg-1 mb-2">Recycling Batteries</h4>
								<p className="ff-body text-fg-3 text-sm leading-relaxed">
									Lithium-ion batteries must always be recycled properly through a designated
									recycling centre. Never place them in household waste — a punctured or
									crushed battery in a refuse lorry can ignite and cause a serious fire.
								</p>
							</div>
						</div>
					</div>

					{/* Purchasing advice */}
					<div className="bg-surface-3 border border-line rounded-2xl p-7 mb-6">
						<div className="ff-display text-flame text-sm tracking-widest mb-3">PURCHASING</div>
						<h3 className="ff-display text-2xl text-fg-1 mb-4">Buying Safely</h3>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
							<div className="bg-base border border-line rounded-xl p-5">
								<div className="text-2xl mb-3">🏪</div>
								<h4 className="ff-display text-lg text-fg-1 mb-2">Reputable Retailers</h4>
								<p className="ff-body text-fg-3 text-sm leading-relaxed">
									Only purchase devices and batteries from established, reputable retailers.
									Avoid unverified third-party sellers on online marketplaces.
								</p>
							</div>
							<div className="bg-base border border-line rounded-xl p-5">
								<div className="text-2xl mb-3">✅</div>
								<h4 className="ff-display text-lg text-fg-1 mb-2">Safety Standards</h4>
								<p className="ff-body text-fg-3 text-sm leading-relaxed">
									Check that devices meet British or European safety standards before
									purchasing. Look for the CE or UKCA mark on the product or packaging.
								</p>
							</div>
							<div className="bg-base border border-line rounded-xl p-5">
								<div className="text-2xl mb-3">📋</div>
								<h4 className="ff-display text-fg-1 text-lg mb-2">Register Products</h4>
								<p className="ff-body text-fg-3 text-sm leading-relaxed">
									Register your device with the manufacturer after purchase so you receive
									safety recall notifications if a fault is identified.
								</p>
							</div>
						</div>
					</div>

					{/* Source attribution */}
					<p className="ff-body text-fg-3 text-xs text-right">
						Source:{" "}
						<a
							href="https://www.firescotland.gov.uk/at-home/lithium-ion-batteries/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-flame hover:text-glow transition-colors underline"
						>
							Scottish Fire &amp; Rescue Service — Lithium-Ion Batteries
						</a>
					</p>
				</section>

				{/* Footer note */}
				<div className="mt-16 text-center ff-body text-fg-3 text-sm font-mono">
					More educational content coming soon · v0.1
				</div>

			</div>
		</div>
	);
}
