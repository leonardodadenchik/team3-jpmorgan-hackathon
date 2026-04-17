/**
 * LeafletHazardMap.tsx
 *
 * Interactive Leaflet map for visualising fire hazard risk zones and fire
 * stations across Glasgow. Designed for use by Scottish Fire & Rescue staff,
 * including those wearing gloves (large tap targets, high-contrast colours).
 *
 * Layout overview:
 *   ┌──────────────┬──────────────────────────────────────┐
 *   │  RankedSidebar│         MapContainer                 │
 *   │  (zones ranked│  markers + MapController inside      │
 *   │  high → low)  │  ZonePanel / StationPanel overlaid   │
 *   └──────────────┴──────────────────────────────────────┘
 *
 * Key interactions:
 *  - Clicking a sidebar row OR a map marker selects that item.
 *  - Selection dims all other markers (keeps colour, reduces opacity).
 *  - The selected marker grows and gets a coloured ring.
 *  - MapController (inside MapContainer) smoothly flies the map to the item.
 *  - A full-screen modal overlay shows the detailed risk breakdown.
 *  - Pressing Escape or clicking the backdrop dismisses the modal.
 *
 * Data flow:
 *  hazard-map.tsx  →  passes zones[] and stations[] as props
 *  LeafletHazardMap  →  owns `selected` state, shared between sidebar + map
 */

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import React, { useEffect, useState } from "react";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const API_BASE = "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// All data-shape types are defined here so they can be imported by the parent
// route (hazard-map.tsx) when constructing the props arrays.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single risk zone (postcode area) with all hazard sub-scores.
 * The five sub-categories each produce a 0–10 score; composite_risk is the
 * weighted aggregate used for ranking and colour coding.
 */
export interface Zone {
	postcode: string;
	name: string;
	lat: number;
	lng: number;

	building_vulnerability: {
		score: number;           // 0–10 risk score
		type: string;            // e.g. "Victorian tenement"
		age: string;             // e.g. "pre-1919"
		shared_stairwell: boolean;
		floors: number;
		notes: string;
	};

	lithium_sources: {
		score: number;           // 0–10 risk score
		ebikes_registered: number;
		ebike_chargers: number;
		electric_cars: number;
		ev_chargers: number;
		escooters: number;
		charging_in_stairwells: boolean; // true = elevated danger
		notes: string;
	};

	human_vulnerability: {
		score: number;           // 0–10 risk score
		elderly_pct: number;     // percentage of elderly residents
		deprivation_decile: number; // 1 = most deprived, 10 = least
		notes: string;
	};

	fire_infrastructure: {
		score: number;           // 0–10 risk score (higher = worse coverage)
		nearest_station_km: number;
		hydrant_count: number;
		access_rating: string;   // "good" | "moderate" | "poor"
	};

	chemical_proximity: {
		score: number;           // 0–10 risk score
		swimming_pool_nearby: boolean; // pools store chlorine
		oil_storage_nearby: boolean;
		notes: string;
		[key: string]: unknown;  // allows extra fields (e.g. pool_distance_m)
	};

	composite_risk: number;      // weighted aggregate of the five sub-scores
	red_zone_trigger: boolean;   // true when building + lithium both score ≥ 8

	/** Weather-driven risk predictions for the next ~12 hours (4 × 3h slots). */
	forecast?: Array<{
		dt:             number;   // Unix timestamp (UTC)
		hour_label:     string;   // "HH:MM" in UTC
		risk_score:     number;   // predicted composite risk 0–10
		risk_level:     string;   // "critical" | "high" | "medium" | "low"
		wind_speed:     number;   // m/s
		wind_direction: number;   // degrees (meteorological — direction wind comes FROM)
		wind_gust:      number;   // m/s
		rain_mm:        number;   // mm in the 3-hour window
		temperature:    number;   // °C
		humidity:       number;   // %
		description:    string;   // e.g. "light rain", "clear sky"
		overnight:      boolean;  // true when slot falls in 22:00–06:00 UTC
	}>;
}

/**
 * A Scottish Fire & Rescue Service station shown as a blue square marker.
 */
export interface Station {
	callsign: string;   // short ID used on appliances, e.g. "B01"
	name: string;       // short station name, e.g. "Cowcaddens"
	fullName: string;   // full official name
	type: string;       // appliance type, e.g. "WT" (Water Tender)
	lat: number;
	lng: number;
}

/**
 * Colour + label metadata derived from a composite risk score.
 * Used by icons, score cards, and the sidebar rank badges.
 */
interface RiskInfo {
	level: string;      // "critical" | "high" | "medium" | "low"
	color: string;      // hex fill colour for the marker / badge
	glow: string;       // rgba shadow colour matching the fill
	label: string;      // uppercase display string, e.g. "CRITICAL"
	textColor: string;  // contrasting text colour for the badge
}

/**
 * Discriminated union representing whatever the user has selected.
 * null means nothing is selected (all markers at full opacity).
 * Using a tagged union keeps the type narrowing clean across components.
 */
type Selected =
	| { type: "zone";    data: Zone }
	| { type: "station"; data: Station }
	| null;

// ─────────────────────────────────────────────────────────────────────────────
// RISK UTILITIES
// getRiskInfo is called by: createZoneIcon, ScoreCard, ZonePanel, RankedSidebar
// Keep it near the top so all consumers can find it easily.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a 0–10 composite risk score to display metadata (colour, label, etc.).
 * Thresholds: critical ≥ 7.5 · high ≥ 6.0 · medium ≥ 4.0 · low < 4.0
 */
function getRiskInfo(riskScore: number): RiskInfo {
	if (riskScore >= 7.5) return { level: "critical", color: "#dc2626", glow: "rgba(220,38,38,0.22)",  label: "CRITICAL", textColor: "#ffffff" };
	if (riskScore >= 6.0) return { level: "high",     color: "#ea580c", glow: "rgba(234,88,12,0.20)",  label: "HIGH",     textColor: "#ffffff" };
	if (riskScore >= 4.0) return { level: "medium",   color: "#ca8a04", glow: "rgba(202,138,4,0.18)",  label: "MEDIUM",   textColor: "#111111" };
	return                       { level: "low",      color: "#16a34a", glow: "rgba(22,163,74,0.18)",  label: "LOW",      textColor: "#ffffff" };
}

/**
 * Returns a Tailwind-compatible hex colour for a 0–10 sub-score.
 * Reused in ScoreCard and anywhere a single sub-score needs a colour.
 */
function getScoreColor(score: number): string {
	if (score >= 8) return "#dc2626"; // red   — very high risk
	if (score >= 6) return "#ea580c"; // orange — high risk
	if (score >= 4) return "#ca8a04"; // amber  — medium risk
	return "#16a34a";                 // green  — low risk
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP MARKER ICONS
// createZoneIcon and createStationIcon are always called together when
// rendering markers, so they live side-by-side here.
//
// Each icon has three visual states:
//   "normal"   — default; full colour, standard size
//   "selected" — larger, white border, coloured outer ring
//   "dimmed"   — same colour but 45% opacity (selection focus effect)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Leaflet DivIcon for a risk zone marker (circle).
 * Critical zones animate a pulsing ring to attract attention.
 *
 * @param zone       - Zone data; used to derive the risk colour.
 * @param markerState - Visual state: "normal" | "selected" | "dimmed"
 */
function createZoneIcon(zone: Zone, markerState: "normal" | "selected" | "dimmed"): L.DivIcon {
	const { color, glow, level } = getRiskInfo(zone.composite_risk);

	// Selected markers are 35% larger to stand out when chosen
	const size         = markerState === "selected" ? 38 : 28;
	const anchorOffset = size / 2; // centre the icon over the coordinate

	// Thicker border on the selected state for added visual weight
	const borderStyle  = markerState === "selected" ? "3px solid #ffffff" : "2px solid #ffffff";

	// Drop shadow disappears when dimmed to further reduce visual noise
	const boxShadow    = markerState === "dimmed"
		? "none"
		: `0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px ${glow}`;

	// Outer ring only shown for the selected marker — confirms which is active
	const selectedRing = markerState === "selected"
		? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};opacity:0.6;"></div>`
		: "";

	// Animated pulse ring only on critical zones that are not dimmed
	const criticalPulse = markerState !== "dimmed" && level === "critical"
		? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};opacity:0.35;animation:hmPulse 1.6s ease-in-out infinite;"></div>`
		: "";

	return L.divIcon({
		className: "", // clear Leaflet's default white box styling
		html: `
			<div style="position:relative;width:${size}px;height:${size}px;">
				${criticalPulse}
				${selectedRing}
				<div style="
					position:relative;z-index:1;
					width:${size}px;height:${size}px;border-radius:50%;
					background:${color};border:${borderStyle};
					box-shadow:${boxShadow};
					cursor:pointer;
					opacity:${markerState === "dimmed" ? 0.45 : 1};
				"></div>
			</div>`,
		iconSize:    [size, size],
		iconAnchor:  [anchorOffset, anchorOffset],
		popupAnchor: [0, -(anchorOffset + 4)],
	});
}

/**
 * Builds the Leaflet DivIcon for a fire station marker (blue square).
 * Stations are square to visually distinguish them from zone circles.
 *
 * @param markerState - Visual state: "normal" | "selected" | "dimmed"
 */
function createStationIcon(markerState: "normal" | "selected" | "dimmed"): L.DivIcon {
	const size         = markerState === "selected" ? 32 : 24;
	const anchorOffset = size / 2;

	// Selected ring uses a rounded-rect instead of circle to match the square shape
	const selectedRing = markerState === "selected"
		? `<div style="position:absolute;inset:-4px;border-radius:6px;border:2px solid #2563eb;opacity:0.6;"></div>`
		: "";

	return L.divIcon({
		className: "",
		html: `
			<div style="position:relative;width:${size}px;height:${size}px;">
				${selectedRing}
				<div style="
					width:${size}px;height:${size}px;border-radius:4px;
					background:#2563eb;border:2px solid #dbeafe;
					box-shadow:${markerState === "dimmed" ? "none" : "0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(37,99,235,0.25)"};
					cursor:pointer;
					opacity:${markerState === "dimmed" ? 0.45 : 1};
				"></div>
			</div>`,
		iconSize:    [size, size],
		iconAnchor:  [anchorOffset, anchorOffset],
		popupAnchor: [0, -(anchorOffset + 4)],
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE CARD
// Used inside ZonePanel to render each of the five risk sub-categories.
// Lives here (before ZonePanel) so ZonePanel can reference it below.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a single risk sub-category as a labelled card with a colour-coded
 * progress bar and a human-readable detail line.
 *
 * Used in a 2-column grid inside ZonePanel so all five categories are
 * visible at once without scrolling.
 */
function ScoreCard({ label, score, detail, inverted = false }: {
	label: string;
	score: number;
	detail: string;
	/** When true the colour scale is flipped: high score = green (good), low = red (poor). */
	inverted?: boolean;
}) {
	// For inverted cards (e.g. fire infrastructure) a high score means good coverage,
	// so colour it green. Use the mirror score purely for the colour lookup.
	const scoreColor = getScoreColor(inverted ? 10 - score : score);

	return (
		<div style={{
			background: "#ffffff",
			border: `1.5px solid ${scoreColor}`,
			borderRadius: 8,
			padding: "12px 14px",
		}}>
			{/* Category name on the left, numeric score on the right */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
				<span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", color: "#374151", textTransform: "uppercase" as const }}>
					{label}
				</span>
				<span style={{ fontSize: 22, fontWeight: 900, color: scoreColor, fontFamily: "monospace", lineHeight: 1 }}>
					{score}<span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>/10</span>
				</span>
			</div>

			{/* Proportional colour bar */}
			<div style={{ height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
				<div style={{ height: "100%", width: `${score * 10}%`, background: scoreColor, borderRadius: 999, transition: "width 0.3s" }} />
			</div>

			{/* Supporting detail text */}
			<p style={{ fontSize: 12, color: "#4b5563", margin: 0, lineHeight: 1.5 }}>{detail}</p>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Converts a meteorological wind-from degree to an 8-point compass string. */
function degreesToCompass(deg: number): string {
	const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
	return dirs[Math.round(deg / 45) % 8];
}

/**
 * Inline forecast timeline shown at the bottom of ZonePanel.
 * Shows 4 three-hour slots with colour-coded risk scores, wind, and rain.
 */
function ForecastStrip({ forecast }: { forecast: NonNullable<Zone["forecast"]> }) {
	if (forecast.length === 0) return null;

	const first = forecast[0].risk_score;
	const last  = forecast[forecast.length - 1].risk_score;
	const delta = last - first;
	const trend =
		delta >  0.5 ? { label: "RISK INCREASING", color: "#dc2626", arrow: "↑" } :
		delta < -0.5 ? { label: "RISK DECREASING", color: "#16a34a", arrow: "↓" } :
		               { label: "RISK STABLE",      color: "#6b7280", arrow: "→" };

	return (
		<div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 16px 14px" }}>
			{/* Section header */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
				<span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#6b7280", textTransform: "uppercase" as const }}>
					Risk Forecast — next 12h
				</span>
				<span style={{ fontSize: 11, fontWeight: 700, color: trend.color }}>
					{trend.arrow} {trend.label}
				</span>
			</div>

			{/* Slot grid */}
			<div style={{ display: "grid", gridTemplateColumns: `repeat(${forecast.length}, 1fr)`, gap: 6 }}>
				{forecast.map((slot) => {
					const ri = getRiskInfo(slot.risk_score);
					return (
						<div
							key={slot.dt}
							style={{
								background: `${ri.color}0d`,
								border: `1.5px solid ${ri.color}40`,
								borderRadius: 8,
								padding: "8px 6px",
								textAlign: "center" as const,
								position: "relative" as const,
							}}
						>
							{/* Time label */}
							<div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", fontFamily: "monospace", marginBottom: 4 }}>
								{slot.hour_label}
							</div>

							{/* Risk score */}
							<div style={{ fontSize: 22, fontWeight: 900, color: ri.color, lineHeight: 1, fontFamily: "monospace" }}>
								{slot.risk_score.toFixed(1)}
							</div>

							{/* Risk level badge */}
							<div style={{
								display: "inline-block", marginTop: 4,
								fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
								padding: "2px 6px", borderRadius: 4,
								background: ri.color, color: ri.textColor,
							}}>
								{ri.label}
							</div>

							{/* Wind */}
							<div style={{ marginTop: 5, fontSize: 11, color: "#374151", fontWeight: 600 }}>
								{degreesToCompass(slot.wind_direction)} {slot.wind_speed}
								<span style={{ fontSize: 10, fontWeight: 400, color: "#9ca3af" }}>m/s</span>
								{slot.wind_gust > slot.wind_speed + 2 && (
									<span style={{ fontSize: 10, color: "#ea580c", marginLeft: 2 }}>
										↑{slot.wind_gust}
									</span>
								)}
							</div>

							{/* Rain */}
							<div style={{ marginTop: 2, fontSize: 10, color: slot.rain_mm > 0.5 ? "#2563eb" : "#9ca3af" }}>
								{slot.rain_mm > 0.5 ? `🌧 ${slot.rain_mm}mm` : "☀ dry"}
							</div>

							{/* Temperature */}
							<div style={{ marginTop: 2, fontSize: 10, color: "#6b7280" }}>
								{slot.temperature}°C · {slot.humidity}%
							</div>

							{/* Overnight badge */}
							{slot.overnight && (
								<div style={{
									position: "absolute" as const, top: 4, right: 4,
									fontSize: 9, background: "#1e1b4b", color: "#a5b4fc",
									padding: "1px 4px", borderRadius: 3, fontWeight: 700,
								}}>
									NIGHT
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Weather description */}
			<div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", fontStyle: "italic" as const, textAlign: "center" as const }}>
				{forecast[0].description} → {forecast[forecast.length - 1].description}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL BACKDROP
// Shared wrapper used by both ZonePanel and StationPanel.
// Renders a semi-transparent overlay over the map; clicking the dark area
// outside the card dismisses it (stopPropagation on the inner card prevents
// clicks inside the card from bubbling up and closing prematurely).
// ─────────────────────────────────────────────────────────────────────────────

/** Shared styles for the right-hand detail drawer. */
const DRAWER_STYLE: React.CSSProperties = {
	width: 360,
	flexShrink: 0,
	background: "#ffffff",
	borderLeft: "1px solid #e5e7eb",
	display: "flex",
	flexDirection: "column",
	overflowY: "auto",
	fontFamily: "system-ui, sans-serif",
	zIndex: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// ZONE MODAL
// Displayed when the user selects a risk zone (circle marker or sidebar row).
// Shows the composite score, a critical alert if applicable, and all five
// sub-category ScoreCards in a 2-column grid — no scrolling required.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full-detail modal for a risk zone.
 * Triggered by clicking a zone marker on the map or a row in RankedSidebar.
 *
 * @param zone    - The zone whose data should be displayed.
 * @param onClose - Called when the user dismisses the modal (× button,
 *                  backdrop click, or Escape key via the parent useEffect).
 */
type AiState =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "done"; text: string }
	| { status: "error"; message: string };

/** Renders the Gemini fire-development narrative with section headings highlighted. */
function FireAnalysisResult({ text }: { text: string }) {
	const HEADINGS = ["IGNITION", "SPREAD", "OCCUPANT IMPACT", "CREW RESPONSE", "WEATHER OUTLOOK"];

	// Split on known headings so we can style them distinctly
	const parts: Array<{ heading: boolean; content: string }> = [];
	let remaining = text;

	for (const heading of HEADINGS) {
		const idx = remaining.indexOf(heading);
		if (idx === -1) continue;
		if (idx > 0) parts.push({ heading: false, content: remaining.slice(0, idx) });
		// Find where the heading's paragraph ends (next heading or end of string)
		const afterHeading = remaining.slice(idx + heading.length);
		const nextHeadingIdx = HEADINGS
			.filter((h) => h !== heading)
			.reduce((min, h) => {
				const i = afterHeading.indexOf(h);
				return i !== -1 && i < min ? i : min;
			}, afterHeading.length);
		parts.push({ heading: true,  content: heading });
		parts.push({ heading: false, content: afterHeading.slice(0, nextHeadingIdx) });
		remaining = afterHeading.slice(nextHeadingIdx);
	}
	if (remaining.trim()) parts.push({ heading: false, content: remaining });

	return (
		<div style={{ fontSize: 13, lineHeight: 1.7, color: "#374151" }}>
			{parts.map((part, i) =>
				part.heading ? (
					<p key={i} style={{
						margin: "12px 0 4px",
						fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
						color: "#b91c1c", textTransform: "uppercase" as const,
					}}>
						{part.content}
					</p>
				) : (
					<p key={i} style={{ margin: 0 }}>{part.content.trim()}</p>
				)
			)}
		</div>
	);
}

function ZonePanel({ zone, onClose }: { zone: Zone; onClose: () => void }) {
	const riskInfo = getRiskInfo(zone.composite_risk);

	const [aiState, setAiState] = useState<AiState>({ status: "idle" });

	async function runAnalysis() {
		setAiState({ status: "loading" });
		try {
			const res = await axios.get(`${API_BASE}/api/zones/${encodeURIComponent(zone.postcode)}/fire-analysis`);
			setAiState({ status: "done", text: res.data.analysis });
		} catch (err) {
			let msg = "Unexpected error — please try again.";
			if (axios.isAxiosError(err)) {
				if (!err.response) {
					msg = "Could not reach the backend. Check that the server is running on " + API_BASE + ".";
				} else if (err.response.status === 404) {
					msg = "Zone not found on the server (postcode: " + zone.postcode + ").";
				} else if (err.response.status === 500) {
					const detail = err.response.data?.detail;
					msg = detail
						? "Server error: " + detail
						: "The AI service returned an error. This may be a temporary issue — please retry.";
				} else {
					msg = `Server responded with ${err.response.status} ${err.response.statusText}.`;
				}
			}
			setAiState({ status: "error", message: msg });
		}
	}

	// Destructure sub-categories into short aliases for cleaner JSX below
	const {
		building_vulnerability:  buildingRisk,
		lithium_sources:         lithiumRisk,
		human_vulnerability:     humanRisk,
		fire_infrastructure:     fireRisk,
		chemical_proximity:      chemicalRisk,
	} = zone;

	// Critical alert triggers:
	//   (a) Chemical proximity score ≥ 7  — nearby pool or oil storage
	//   (b) Both building AND lithium ≥ 8  — worst-case combination
	const showCriticalAlert = chemicalRisk.score >= 7 || (buildingRisk.score >= 8 && lithiumRisk.score >= 8);

	// All five risk sub-categories in a consistent shape for the grid
	const riskCategories = [
		{
			label:  "Lithium Sources",
			score:  lithiumRisk.score,
			detail: `${lithiumRisk.ebikes_registered} e-bikes · ${lithiumRisk.ebike_chargers} chargers · ${lithiumRisk.escooters} e-scooters`
				+ (lithiumRisk.charging_in_stairwells ? " · ⚠ stairwell charging" : ""),
		},
		{
			label:  "Building Vulnerability",
			score:  buildingRisk.score,
			detail: `${buildingRisk.type} · ${buildingRisk.age} · ${buildingRisk.floors} floors`
				+ (buildingRisk.shared_stairwell ? " · shared stairwell" : ""),
		},
		{
			label:  "Human Vulnerability",
			score:  humanRisk.score,
			detail: `${humanRisk.elderly_pct}% elderly · deprivation decile ${humanRisk.deprivation_decile}`,
		},
		{
			label:    "Fire Infrastructure",
			score:    fireRisk.score,
			detail:   `${fireRisk.nearest_station_km}km to station · ${fireRisk.hydrant_count} hydrants · ${fireRisk.access_rating} access`,
			inverted: true,
		},
		{
			label:  "Chemical Proximity",
			score:  chemicalRisk.score,
			detail: chemicalRisk.notes as string,
		},
	];

	return (
		<div style={DRAWER_STYLE} role="complementary" aria-label={`Hazard detail for ${zone.name}`}>

			{/* ── Header ── */}
			<div style={{
				padding: "16px 16px 12px",
				borderBottom: "1px solid #e5e7eb",
				background: `${riskInfo.color}08`,
			}}>
				{/* Top row: score badge + close */}
				<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
					<div style={{
						display: "flex", alignItems: "baseline", gap: 4,
						padding: "6px 12px", borderRadius: 6,
						border: `2px solid ${riskInfo.color}`,
						background: `${riskInfo.color}12`,
					}}>
						<span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: riskInfo.color, fontFamily: "monospace" }}>
							{zone.composite_risk.toFixed(1)}
						</span>
						<span style={{ fontSize: 14, color: "#9ca3af", fontWeight: 600 }}>/10</span>
					</div>

					<button
						onClick={onClose}
						aria-label="Close hazard detail panel"
						style={{
							width: 40, height: 40, borderRadius: 6,
							border: "1.5px solid #d1d5db", background: "#f9fafb",
							cursor: "pointer", fontSize: 22, color: "#374151",
							display: "flex", alignItems: "center", justifyContent: "center",
							lineHeight: 1, padding: 0, flexShrink: 0,
						}}
					>×</button>
				</div>

				{/* Zone name */}
				<div style={{ fontSize: 20, fontWeight: 900, color: "#111827", lineHeight: 1.15, marginBottom: 6 }}>
					{zone.name}
				</div>

				{/* Postcode + badges */}
				<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
					<span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{zone.postcode}</span>
					<div style={{
						fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
						padding: "3px 10px", borderRadius: 4,
						background: riskInfo.color, color: riskInfo.textColor,
					}}>
						{riskInfo.label}
					</div>
					{zone.red_zone_trigger && (
						<div style={{
							display: "flex", alignItems: "center", gap: 4,
							fontSize: 11, fontWeight: 800, color: "#dc2626",
							padding: "3px 8px", borderRadius: 4,
							border: "1.5px solid #dc2626", background: "#fef2f2",
						}}>
							🔴 RED ZONE
						</div>
					)}
				</div>
			</div>

			{/* ── Critical alert ── */}
			{showCriticalAlert && (
				<div style={{
					borderLeft: "4px solid #dc2626", background: "#fef2f2",
					padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10,
				}}>
					<span style={{ fontSize: 18, flexShrink: 0 }}>🚨</span>
					<div>
						{chemicalRisk.score >= 7 && (
							<p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", margin: "0 0 2px" }}>
								{chemicalRisk.notes as string}
							</p>
						)}
						{buildingRisk.score >= 8 && lithiumRisk.score >= 8 && (
							<p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", margin: 0 }}>
								High-risk building + high lithium density
							</p>
						)}
					</div>
				</div>
			)}

			{/* ── Risk score cards ── */}
			<div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
				{riskCategories.map(({ label, score, detail, inverted }) => (
					<ScoreCard key={label} label={label} score={score} detail={detail} inverted={inverted} />
				))}
				{buildingRisk.notes && (
					<div style={{ gridColumn: "1 / -1", paddingTop: 8, borderTop: "1px solid #f3f4f6" }}>
						<p style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>
							<strong style={{ color: "#374151" }}>Notes: </strong>{buildingRisk.notes}
						</p>
					</div>
				)}
			</div>

			{/* ── Risk forecast ── */}
			{zone.forecast && zone.forecast.length > 0 && (
				<ForecastStrip forecast={zone.forecast} />
			)}

			{/* ── AI fire analysis ── */}
			<div style={{ borderTop: "1px solid #e5e7eb", padding: "14px 16px 20px" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
					<span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#6b7280", textTransform: "uppercase" as const }}>
						AI Fire Analysis
					</span>
					{aiState.status === "done" && (
						<span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓ Powered by Gemini</span>
					)}
				</div>

				{(aiState.status === "idle" || aiState.status === "loading") && (
					<button
						onClick={runAnalysis}
						disabled={aiState.status === "loading"}
						style={{
							width: "100%", padding: "11px 16px",
							background: aiState.status === "loading" ? "#fee2e2" : "#dc2626",
							color: aiState.status === "loading" ? "#b91c1c" : "#ffffff",
							border: "none", borderRadius: 6,
							cursor: aiState.status === "loading" ? "default" : "pointer",
							fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
							display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
						}}
					>
						{aiState.status === "loading" ? (
							<>
								<span style={{
									width: 14, height: 14, borderRadius: "50%",
									border: "2px solid #b91c1c", borderTopColor: "transparent",
									animation: "hmSpin 0.7s linear infinite", display: "inline-block",
								}} />
								Generating analysis…
							</>
						) : "Generate AI Fire Analysis"}
					</button>
				)}

				{aiState.status === "error" && (
					<div style={{ border: "1.5px solid #fca5a5", borderRadius: 6, background: "#fef2f2", padding: "12px 14px" }}>
						<p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>Analysis failed</p>
						<p style={{ margin: "0 0 10px", fontSize: 12, color: "#7f1d1d", lineHeight: 1.5 }}>{aiState.message}</p>
						<button
							onClick={runAnalysis}
							style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}
						>
							Retry
						</button>
					</div>
				)}

				{aiState.status === "done" && (
					<>
						<FireAnalysisResult text={aiState.text} />
						<div style={{
							marginTop: 12, padding: "8px 12px",
							background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6,
							display: "flex", gap: 8, alignItems: "flex-start",
						}}>
							<span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
							<p style={{ margin: 0, fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
								<strong>AI-generated — use as a guide only.</strong> Always verify against on-ground intelligence and SFRS procedures.
							</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATION MODAL
// Displayed when the user selects a fire station (square marker or sidebar row).
// Simpler than ZonePanel — stations don't have risk scores, just identity data.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detail modal for a Scottish Fire & Rescue Service station.
 *
 * @param station - The station whose data should be displayed.
 * @param onClose - Dismiss handler (same pattern as ZonePanel).
 */
function StationPanel({ station, onClose }: { station: Station; onClose: () => void }) {
	// Map the "WT" appliance code to a human-readable string for display
	const applianceLabel = station.type === "WT" ? "Water Tender (WT)" : station.type;

	const stationDetails = [
		{ label: "Full Name", value: station.fullName },
		{ label: "Callsign",  value: station.callsign },
		{ label: "Appliance", value: applianceLabel },
	];

	return (
		<div style={DRAWER_STYLE} role="complementary" aria-label={`Station detail for ${station.name}`}>
			{/* Blue header */}
			<div style={{ background: "#1d4ed8", padding: "18px 16px 16px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div>
						<div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "#93c5fd", marginBottom: 6 }}>
							FIRE STATION
						</div>
						<div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>
							{station.name}
						</div>
						<div style={{ fontSize: 14, color: "#bfdbfe", fontFamily: "monospace", marginTop: 6 }}>
							{station.callsign}
						</div>
					</div>
					<button
						onClick={onClose}
						aria-label="Close station detail panel"
						style={{
							width: 40, height: 40, borderRadius: 6,
							border: "1.5px solid rgba(255,255,255,0.35)",
							background: "rgba(255,255,255,0.12)", cursor: "pointer",
							fontSize: 22, color: "#ffffff",
							display: "flex", alignItems: "center", justifyContent: "center",
							padding: 0, flexShrink: 0,
						}}
					>×</button>
				</div>
			</div>

			{/* Detail rows */}
			<div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 0 }}>
				{stationDetails.map(({ label, value }) => (
					<div key={label} style={{
						display: "flex", justifyContent: "space-between", alignItems: "center",
						gap: 12, padding: "13px 0", borderBottom: "1px solid #f3f4f6",
					}}>
						<span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase" as const }}>
							{label}
						</span>
						<span style={{ fontSize: 15, fontWeight: 700, color: "#111827", textAlign: "right" as const }}>
							{value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// RANKED SIDEBAR
// Persistent left-hand panel listing all zones ranked highest → lowest risk,
// followed by all fire stations. Designed for gloved-hand use: each row is
// at minimum 56px tall. Selecting a row updates `selected` in the parent,
// which triggers MapController to fly the map to that location.
// ─────────────────────────────────────────────────────────────────────────────

interface RankedSidebarProps {
	zones:    Zone[];
	stations: Station[];
	selected: Selected;                   // current selection (drives active highlight)
	onSelect: (item: Selected) => void;   // updates parent state
}

/**
 * Left sidebar with zones ranked by composite_risk (descending) and a fire
 * stations section below. Tapping a row selects the item and triggers the
 * map flyTo animation via the shared `selected` state.
 */
function RankedSidebar({ zones, stations, selected, onSelect }: RankedSidebarProps) {
	// Sort a copy so the original prop array order is not mutated
	const zonesSortedByRisk = [...zones].sort((a, b) => b.composite_risk - a.composite_risk);

	return (
		<div style={{
			width: 220, flexShrink: 0,
			background: "#ffffff", borderRight: "1px solid #e5e7eb",
			display: "flex", flexDirection: "column",
			fontFamily: "system-ui, sans-serif", overflow: "hidden",
		}}>
			{/* Sidebar header */}
			<div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}>
				<div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", color: "#6b7280", textTransform: "uppercase" }}>
					Risk Zones
				</div>
				<div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Ranked highest → lowest</div>
			</div>

			{/* Scrollable list (sidebar itself scrolls, not the modal content) */}
			<div style={{ flex: 1, overflowY: "auto" }}>

				{/* ── Zone rows ── */}
				{zonesSortedByRisk.map((zone, rankIndex) => {
					const riskInfo = getRiskInfo(zone.composite_risk);
					// Highlight the row whose postcode matches the current selection
					const isActiveZone = selected?.type === "zone" && selected.data.postcode === zone.postcode;

					return (
						<button
							key={zone.postcode}
							onClick={() => onSelect({ type: "zone", data: zone })}
							style={{
								width: "100%", textAlign: "left",
								padding: "12px 14px", minHeight: 56, // 56px minimum for glove tapping
								borderBottom: "1px solid #f3f4f6",
								// Active row gets a subtle tinted background and coloured left border
								background:  isActiveZone ? `${riskInfo.color}12` : "transparent",
								borderLeft:  isActiveZone ? `3px solid ${riskInfo.color}` : "3px solid transparent",
								cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
							}}
						>
							{/* Rank badge (1-based) coloured by risk level */}
							<div style={{
								flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
								background: riskInfo.color,
								display: "flex", alignItems: "center", justifyContent: "center",
								fontSize: 10, fontWeight: 800, color: riskInfo.textColor,
							}}>
								{rankIndex + 1}
							</div>

							{/* Zone name + risk badge + score + red-zone dot */}
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{
									fontSize: 13, fontWeight: 700, color: "#111827",
									whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
								}}>
									{zone.name}
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
									<div style={{
										fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
										padding: "2px 6px", borderRadius: 4,
										background: riskInfo.color, color: riskInfo.textColor,
									}}>
										{riskInfo.label}
									</div>
									<span style={{ fontSize: 11, fontWeight: 700, color: riskInfo.color, fontFamily: "monospace" }}>
										{zone.composite_risk.toFixed(1)}
									</span>
									{/* Small red dot flags red-zone-triggered areas at a glance */}
									{zone.red_zone_trigger && (
										<div
											title="Red zone triggered"
											style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }}
										/>
									)}
								</div>
							</div>
						</button>
					);
				})}

				{/* ── Fire stations section divider ── */}
				<div style={{
					padding: "10px 14px 8px",
					background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #f3f4f6",
				}}>
					<div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", color: "#6b7280", textTransform: "uppercase" }}>
						Fire Stations
					</div>
				</div>

				{/* ── Station rows ── */}
				{stations.map((station) => {
					const isActiveStation = selected?.type === "station" && selected.data.callsign === station.callsign;

					return (
						<button
							key={station.callsign}
							onClick={() => onSelect({ type: "station", data: station })}
							style={{
								width: "100%", textAlign: "left",
								padding: "12px 14px", minHeight: 56,
								borderBottom: "1px solid #f3f4f6",
								background:  isActiveStation ? "#eff6ff" : "transparent",
								borderLeft:  isActiveStation ? "3px solid #2563eb" : "3px solid transparent",
								cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
							}}
						>
							{/* "FS" badge matches the blue square station marker */}
							<div style={{
								flexShrink: 0, width: 22, height: 22, borderRadius: 4,
								background: "#2563eb",
								display: "flex", alignItems: "center", justifyContent: "center",
								fontSize: 9, fontWeight: 800, color: "#ffffff", letterSpacing: "0.05em",
							}}>
								FS
							</div>

							{/* Station name + callsign */}
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{
									fontSize: 13, fontWeight: 700, color: "#111827",
									whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
								}}>
									{station.name}
								</div>
								<div style={{ fontSize: 11, color: "#2563eb", fontFamily: "monospace", marginTop: 2 }}>
									{station.callsign}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP CONTROLLER
// This component MUST live inside <MapContainer> to access the Leaflet map
// instance via useMap(). It watches `selected` and smoothly flies the map
// camera to the selected item's coordinates whenever the selection changes.
// It renders nothing to the DOM (returns null).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Headless component that synchronises the map camera with the selected item.
 * Must be placed as a child of <MapContainer> so useMap() works correctly.
 *
 * flyTo parameters: zoom 15, 1.2-second animation — close enough to see
 * building-level detail without being so fast it's disorienting.
 */
function MapController({ selected }: { selected: Selected }) {
	const leafletMap = useMap();

	useEffect(() => {
		if (!selected) return; // nothing selected — leave the map where it is

		// Both zone and station share lat/lng at the top level of their data shape
		const { lat, lng } = selected.data;
		leafletMap.flyTo([lat, lng], 15, { duration: 1.2 });
	}, [selected, leafletMap]);

	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// LeafletHazardMap owns the `selected` state and wires everything together:
//   - RankedSidebar (left)  ─┐
//   - Map markers            ├─ all read/write `selected`
//   - ZonePanel / StationPanel (modal overlay on the map area)
//
// The Escape key listener here covers the modal close — centralised so it
// doesn't need to be duplicated inside each panel component.
// ─────────────────────────────────────────────────────────────────────────────


/** Props passed in from the parent route (hazard-map.tsx). */
interface LeafletHazardMapProps {
	zones:    Zone[];
	stations: Station[];
}

/**
 * Root map component. Renders the ranked sidebar, the Leaflet map, and the
 * detail modal overlay. All three share a single `selected` state so they
 * stay in sync without prop drilling or a context provider.
 */
export default function LeafletHazardMap({ zones, stations }: LeafletHazardMapProps) {
	// null = nothing selected; otherwise holds the tagged item
	const [selected, setSelected] = useState<Selected>(null);


	// Global Escape key listener — closes whichever modal is open
	useEffect(() => {
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSelected(null);
		};
		window.addEventListener("keydown", handleEscapeKey);
		return () => window.removeEventListener("keydown", handleEscapeKey);
	}, []);

	return (
		<>
			{/*
			  Global CSS injected once:
			  - hmPulse: keyframe for the critical-zone pulsing ring on markers
			  - Leaflet overrides: keep the map controls on-brand (light theme)
			*/}
			<style>{`
				@keyframes hmPulse {
					0%, 100% { transform: scale(1);   opacity: 0.35; }
					50%       { transform: scale(1.6); opacity: 0;    }
				}
				@keyframes hmSpin {
					to { transform: rotate(360deg); }
				}
				.leaflet-container { background: #f8fafc !important; }
				.leaflet-control-zoom a {
					background: #ffffff !important;
					color: #374151 !important;
					border-color: #d1d5db !important;
				}
				.leaflet-control-zoom a:hover {
					background: #f3f4f6 !important;
					color: #111827 !important;
				}
				.leaflet-control-attribution {
					background: rgba(255,255,255,0.92) !important;
					color: #6b7280 !important;
					font-size: 10px !important;
				}
				.leaflet-control-attribution a { color: #374151 !important; }
			`}</style>

			<div
				role="region"
				aria-label="Glasgow fire hazard interactive map. Select a zone or station to view details."
				style={{ display: "flex", height: "100%", width: "100%" }}
			>
				{/* Left sidebar — ranked zone list + fire stations */}
				<RankedSidebar
					zones={zones}
					stations={stations}
					selected={selected}
					onSelect={setSelected}
				/>

				{/* Map — shrinks when detail panel is open */}
				<div style={{ flex: 1, minWidth: 0 }}>
					<MapContainer
						center={[55.864, -4.251]}
						zoom={12}
						style={{ height: "100%", width: "100%" }}
						zoomControl
						scrollWheelZoom
					>
						<TileLayer
							attribution='&copy; OpenStreetMap &copy; CARTO'
							url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
						/>

						<MapController selected={selected} />

						{stations.map((station) => {
							const isThisStationSelected = selected?.type === "station" && selected.data.callsign === station.callsign;
							const isAnotherItemSelected = selected !== null && !isThisStationSelected;
							const markerState = isThisStationSelected ? "selected" : isAnotherItemSelected ? "dimmed" : "normal";
							return (
								<Marker
									key={station.callsign}
									position={[station.lat, station.lng]}
									icon={createStationIcon(markerState)}
									title={station.fullName}
									keyboard={true}
									eventHandlers={{ click: () => setSelected({ type: "station", data: station }) }}
								/>
							);
						})}

						{zones.map((zone) => {
							const isThisZoneSelected = selected?.type === "zone" && selected.data.postcode === zone.postcode;
							const isAnotherItemSelected = selected !== null && !isThisZoneSelected;
							const markerState = isThisZoneSelected ? "selected" : isAnotherItemSelected ? "dimmed" : "normal";
							return (
								<Marker
									key={zone.postcode}
									position={[zone.lat, zone.lng]}
									icon={createZoneIcon(zone, markerState)}
									title={`${zone.name} (${zone.postcode})`}
									keyboard={true}
									eventHandlers={{ click: () => setSelected({ type: "zone", data: zone }) }}
								/>
							);
						})}
					</MapContainer>
				</div>

				{/* Right detail drawer — sits alongside the map, not over it */}
				{selected?.type === "zone" && (
					<ZonePanel zone={selected.data} onClose={() => setSelected(null)} />
				)}
				{selected?.type === "station" && (
					<StationPanel station={selected.data} onClose={() => setSelected(null)} />
				)}
			</div>
		</>
	);
}
