import type { Route } from "./+types/hazard-map";
import { useState, useEffect, lazy, Suspense } from "react";
import axios from "axios";
import type { Zone, Station } from "../components/LeafletHazardMap";

const LeafletHazardMap = lazy(() => import("../components/LeafletHazardMap"));

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Hazard Map | Fire Risk Intelligence" },
		{ name: "description", content: "Live fire hazard map for Glasgow with risk zones and building data." },
	];
}

// In production (served by FastAPI), API calls go to the same origin.
// Set VITE_API_BASE in .env to override for local dev without the proxy.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface RiskCounts {
	critical: number;
	high: number;
	medium: number;
	low: number;
}

const LEGEND = [
	{ color: "#ef4444", label: "Critical",     sub: "risk ≥ 7.5",    pulse: true,  shape: "circle" as const },
	{ color: "#f97316", label: "High",         sub: "risk 6.0–7.4",  pulse: false, shape: "circle" as const },
	{ color: "#eab308", label: "Medium",       sub: "risk 4.0–5.9",  pulse: false, shape: "circle" as const },
	{ color: "#22c55e", label: "Low",          sub: "risk < 4.0",    pulse: false, shape: "circle" as const },
	{ color: "#1d4ed8", label: "Fire Station", sub: "Scottish F&RS", pulse: false, shape: "square"  as const },
];

const MAP_LOADING = (
	<div className="h-full bg-surface-3 flex items-center justify-center font-mono text-[0.9rem] tracking-[0.15em] text-fg-3">
		LOADING MAP…
	</div>
);

const RISK_FILTERS = [
	{ key: "critical", label: "CRITICAL", color: "#dc2626" },
	{ key: "high",     label: "HIGH",     color: "#ea580c" },
	{ key: "medium",   label: "MEDIUM",   color: "#ca8a04" },
	{ key: "low",      label: "LOW",      color: "#16a34a" },
] as const;

export default function HazardMap() {
	const [isClient, setIsClient] = useState(false);
	const [isOnline, setIsOnline] = useState(true);

	const [zones, setZones] = useState<Zone[]>([]);
	const [stations, setStations] = useState<Station[]>([]);
	const [riskCounts, setRiskCounts] = useState<RiskCounts>({ critical: 0, high: 0, medium: 0, low: 0 });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<string>("");

	// ── Filter state ──
	const [activeRiskFilters, setActiveRiskFilters] = useState<Set<string>>(new Set());
	const [redZoneOnly, setRedZoneOnly] = useState(false);

	function toggleRiskFilter(key: string) {
		setActiveRiskFilters(prev => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			return next;
		});
	}

	function clearFilters() {
		setActiveRiskFilters(new Set());
		setRedZoneOnly(false);
	}

	const isFiltered = activeRiskFilters.size > 0 || redZoneOnly;

	const filteredZones = zones.filter(z => {
		if (activeRiskFilters.size > 0) {
			const level =
				z.composite_risk >= 7.5 ? "critical" :
				z.composite_risk >= 6.0 ? "high" :
				z.composite_risk >= 4.0 ? "medium" : "low";
			if (!activeRiskFilters.has(level)) return false;
		}
		if (redZoneOnly && !z.red_zone_trigger) return false;
		return true;
	});

	useEffect(() => {
		setIsClient(true);
		setIsOnline(navigator.onLine);
	}, []);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			setError(null);
			try {
				const [zonesRes, stationsRes, summaryRes] = await Promise.all([
					axios.get(`${API_BASE}/api/zones/raw`),
					axios.get(`${API_BASE}/api/stations`),
					axios.get(`${API_BASE}/api/summary`),
				]);

				setZones(zonesRes.data);
				setStations(stationsRes.data);
				setRiskCounts({
					critical: summaryRes.data.critical,
					high: summaryRes.data.high,
					medium: summaryRes.data.medium,
					low: summaryRes.data.low,
				});

				const now = new Date();
				setLastUpdated(
					now.toISOString().slice(0, 10) + " " +
					now.toTimeString().slice(0, 5) + " UTC"
				);
			} catch (err) {
				if (axios.isAxiosError(err)) {
					setError(err.response
						? `Request failed: ${err.response.status} ${err.response.statusText}`
						: err.message
					);
				} else {
					setError(err instanceof Error ? err.message : "Failed to load hazard data");
				}
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, []);

	return (
		<div className="min-h-screen overflow-x-hidden">

			{/* ── Top banner ── */}
			<div className="bg-fire py-2 px-8 flex items-center justify-center" role="banner">
				<span className="ff-display font-mono text-[0.7rem] tracking-[0.2em] text-white">
					FIRE RISK PLATFORM · GLASGOW · LIVE HAZARD MAP
				</span>
			</div>

			{/* ── Offline status ── */}
			{!isOnline && (
				<div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center gap-3">
					<span className="text-xl">📡</span>
					<div>
						<p className="ff-display text-sm text-amber-900 font-bold">OFFLINE MODE</p>
						<p className="text-xs text-amber-800">Map data may be out of date. Reconnect to sync latest hazards.</p>
					</div>
				</div>
			)}

			{/* ── API error banner ── */}
			{error && (
				<div className="bg-red-50 border-b border-red-200 px-8 py-3 flex items-center gap-3">
					<span className="text-xl">⚠️</span>
					<div>
						<p className="ff-display text-sm text-red-900 font-bold">DATA LOAD ERROR</p>
						<p className="text-xs text-red-800">{error}. Check that the backend is running on {API_BASE}.</p>
					</div>
				</div>
			)}

			{/* ── Page header ── */}
			<div className="max-w-[1200px] mx-auto px-8 pt-10 pb-6">
				<div className="flex flex-wrap justify-between items-end gap-4">
					<div>
						<h1 className="ff-display text-[clamp(2.5rem,6vw,4.5rem)] leading-none text-fg-1 mb-1">
							LIVE HAZARD MAP
						</h1>
						<p className="ff-body text-fg-3 text-[0.95rem]">
							Glasgow · {loading ? "…" : isFiltered ? `${filteredZones.length} of ${zones.length}` : zones.length} zones monitored · click any marker for full hazard detail
						</p>
					</div>

					{/* Legend and status */}
					<div className="flex flex-col items-end gap-3">
						<div className="flex flex-wrap gap-5 items-center justify-end">
							{LEGEND.map(({ color, label, sub, pulse, shape }) => (
								<div key={label} className="flex items-center gap-2">
									<div className="relative shrink-0" style={{ width: 14, height: 14 }}>
										<div
											className={shape === "square" ? "rounded-[3px]" : "rounded-full"}
											style={{
												width: 14,
												height: 14,
												background: color,
												border: shape === "square" ? "1.5px solid #93c5fd" : undefined,
											}}
										/>
										{pulse && (
											<div
												className="absolute rounded-full border-2 opacity-50"
												style={{ inset: -4, borderColor: color, animation: "hmPulse 1.6s ease-in-out infinite" }}
											/>
										)}
									</div>
									<div>
										<div className="ff-display text-[0.8rem] text-fg-2 leading-none">{label}</div>
										<div className="font-mono text-[10px] text-fg-3">{sub}</div>
									</div>
								</div>
							))}
						</div>

						{/* Data timestamp */}
						<div className="font-mono text-[0.7rem] text-fg-4">
							{lastUpdated ? `Last updated: ${lastUpdated}` : loading ? "Fetching data…" : ""}
							<span className={`ml-2 inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
						</div>
					</div>
				</div>
			</div>

			{/* ── Risk summary strip ── */}
			<div className="bg-surface-3 border-t border-b border-line">
				<div className="max-w-[1200px] mx-auto flex gap-px bg-line">
					{[
						{ count: riskCounts.critical, label: "CRITICAL ZONES", color: "#ef4444" },
						{ count: riskCounts.high,     label: "HIGH RISK",      color: "#f97316" },
						{ count: riskCounts.medium,   label: "MEDIUM RISK",    color: "#eab308" },
						{ count: riskCounts.low,      label: "LOW RISK",       color: "#22c55e" },
						{ count: stations.length,     label: "FIRE STATIONS",  color: "#60a5fa" },
					].map(({ count, label, color }) => (
						<div key={label} className="flex-1 bg-surface-3 py-3 px-5 text-center">
							<div className="ff-display text-[2rem] leading-none" style={{ color }}>
								{loading ? "—" : count}
							</div>
							<div className="font-mono text-[0.65rem] text-fg-3 tracking-[0.12em] mt-0.5">{label}</div>
						</div>
					))}
				</div>
			</div>

			{/* ── Filter bar ── */}
			{!loading && (
				<div className="border-b border-line" style={{ background: "var(--color-surface-2, #111)" }}>
					<div className="max-w-[1200px] mx-auto px-8 py-2.5 flex flex-wrap items-center gap-2">

						<span className="ff-display text-[0.6rem] tracking-[0.2em] text-fg-3 shrink-0">
							FILTER BY RISK
						</span>

						<div className="w-px h-4 bg-line shrink-0" />

						{RISK_FILTERS.map(({ key, label, color }) => {
							const active = activeRiskFilters.has(key);
							return (
								<button
									key={key}
									onClick={() => toggleRiskFilter(key)}
									aria-pressed={active}
									className="ff-display text-[0.68rem] tracking-[0.1em] px-3 py-1.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
									style={{
										border:     `1.5px solid ${active ? color : "rgba(255,255,255,0.15)"}`,
										background:  active ? color : "transparent",
										color:       active ? "#fff" : color,
										borderRadius: 4,
									}}
								>
									{label}
								</button>
							);
						})}

						<div className="w-px h-4 bg-line shrink-0" />

						<button
							onClick={() => setRedZoneOnly(v => !v)}
							aria-pressed={redZoneOnly}
							className="ff-display text-[0.68rem] tracking-[0.1em] px-3 py-1.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
							style={{
								border:      `1.5px solid ${redZoneOnly ? "#dc2626" : "rgba(255,255,255,0.15)"}`,
								background:   redZoneOnly ? "#dc2626" : "transparent",
								color:        redZoneOnly ? "#fff"    : "#f87171",
								borderRadius: 4,
							}}
						>
							● RED ZONE ONLY
						</button>

						{isFiltered && (
							<>
								<span className="ff-body text-[0.72rem] text-fg-3 ml-1">
									{filteredZones.length} of {zones.length} shown
								</span>
								<button
									onClick={clearFilters}
									className="ff-display text-[0.65rem] tracking-[0.12em] px-3 py-1.5 ml-auto transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow hover:text-fg-1"
									style={{
										border: "1.5px solid rgba(255,255,255,0.2)",
										background: "transparent",
										color: "var(--color-fg-3)",
										borderRadius: 4,
									}}
								>
									CLEAR ×
								</button>
							</>
						)}
					</div>
				</div>
			)}

			{/* ── Map ── */}
			<div className="relative" style={{ height: "65vh", minHeight: 480 }}>
				{isClient ? (
					loading ? MAP_LOADING : (
						<Suspense fallback={MAP_LOADING}>
							<LeafletHazardMap zones={filteredZones} stations={stations} />
						</Suspense>
					)
				) : MAP_LOADING}
			</div>

			{/* ── Info band ── */}
			<div className="max-w-[1200px] mx-auto px-8 py-6">
				<div
					className="border border-[#3a0000] p-4 bg-fire/[0.06] animate-pulse-border"
					role="note"
					aria-label="Map usage guidance"
				>
					<p className="ff-display text-glow text-xl mb-1">HOW TO USE THIS MAP</p>
					<p className="ff-body text-fg-3 text-[0.92rem] leading-[1.6]">
						Click any coloured marker to expand full hazard detail — building type, lithium source density,
						human vulnerability, fire infrastructure, and chemical proximity scores.
						Red pulsing markers indicate red-zone triggers where high lithium density and a vulnerable
						old building coincide. Blue square markers show Scottish Fire &amp; Rescue stations.
					</p>
				</div>
			</div>

			{/* ── Footer ── */}
			<footer className="border-t border-[#1a1a1a] py-8 px-8 text-center">
				<p className="ff-body text-[0.8rem] text-fg-3 tracking-[0.1em]">
					FIRE RISK INTELLIGENCE · FOR GLASGOW · HAZARD MAP
				</p>
			</footer>

			<style>{`
				@keyframes hmPulse {
					0%,100% { transform:scale(1); opacity:0.5; }
					50%      { transform:scale(1.7); opacity:0; }
				}
			`}</style>
		</div>
	);
}
