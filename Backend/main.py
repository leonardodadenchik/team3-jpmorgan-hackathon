import asyncio
import os

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json

from .data_processor import ai_standardize_data, generate_fire_analysis
from .risk_engine import score_all_zones, score_zone, get_risk_level, get_raw_data, forecast_zone_risk
from .predictor import run_ml
from datetime import datetime
from .models import ZoneResponse, ZonePredictionResponse, ZoneSimulatedResponse, SummaryResponse, FireStationResponse, \
    AnalysisResponse
from .weather_service import get_weather_modifiers, get_forecast_modifiers

app = FastAPI(title="Glasgow Hazard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIONS_FILE = os.path.join(BASE_DIR, "glasgow_fire_stations.json")

# Path to the React SPA static build (front-end/jpmorgan/build/client/)
STATIC_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "front-end", "jpmorgan", "build", "client"))


# endpoints


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/stations", response_model=list[FireStationResponse])
async def get_stations():
    try:
        with open(STATIONS_FILE, "r") as f:
            stations = json.load(f)
        return stations
    except Exception as e:
        # If file is missing or broken, don't crash the whole API
        raise HTTPException(status_code=500, detail=f"Error loading stations: {e}")

@app.get("/api/zones/raw")
async def get_raw_zones():
    zones = get_raw_data()
    forecast_slots = await get_forecast_modifiers(slots=4)

    if not forecast_slots:
        # Weather API unavailable — return zones without forecast rather than failing
        return zones

    return [
        {**zone, "forecast": forecast_zone_risk(zone, forecast_slots)}
        for zone in zones
    ]

@app.get("/api/zones", response_model=list[ZoneResponse])
async def get_zones(
        risk: str = Query(None, description="Filter by risk level"),
        trigger: bool = Query(None, description="Filter red zone trigger")
):
    # 1. Fetch the live multiplier once
    weather_data = await get_weather_modifiers()
    multiplier = weather_data["impact_multiplier"]  # Extract just the number for the math
    zones = score_all_zones(multiplier)

    # 3. Filtering logic
    if risk:
        zones = [z for z in zones if z["risk_level"] == risk]
    if trigger is not None:
        zones = [z for z in zones if z["red_zone_trigger"] == trigger]

    return zones



@app.post("/api/analyze-report", response_model=AnalysisResponse)
async def analyze_report(raw_text: str):
    """
    New Endpoint: Uses Gemini to clean raw text, then runs it through the AHP engine.
    """
    # 1. AI Cleanup (Gemini)
    ai_data = ai_standardize_data(raw_text)

    # 2. Get Weather (Live API)
    weather_data = await get_weather_modifiers()
    # We extract the multiplier for the math, but keep the whole object for the return
    weather_multiplier = weather_data["impact_multiplier"]

    # 3. Calculate Risk (AHP Math)
    from .risk_engine import calculate_ahp_risk
    risk_score, is_red = calculate_ahp_risk(ai_data, weather_multiplier)

    # 4. Construct response to match your Models exactly
    return {
        "structured_data": ai_data,
        "calculated_risk": risk_score,
        "is_red_zone": is_red,
        "weather_impact": weather_data,  # This now returns the full dict (speed, direction, etc.)
        "reliability_score": ai_data.get("confidence_score", 0.5)
    }



@app.get("/api/summary", response_model=SummaryResponse)
async def get_summary():
    m = await get_weather_modifiers()

    zones = score_all_zones(m["impact_multiplier"])

    return {
        "total_zones": len(zones),
        "critical": sum(1 for z in zones if z["risk_level"] == "critical"),
        "high": sum(1 for z in zones if z["risk_level"] == "high"),
        "medium": sum(1 for z in zones if z["risk_level"] == "medium"),
        "low": sum(1 for z in zones if z["risk_level"] == "low"),
        "red_zone_triggers": sum(1 for z in zones if z["red_zone_trigger"]),
    }

@app.get("/api/zones/{postcode}/fire-analysis")
async def get_fire_analysis(postcode: str):
    """
    On-demand AI narrative describing how a fire would develop at this zone.
    Combines raw hazard scores, live weather, and 12-hour forecast into a
    Gemini-generated operational briefing. Only called when the user requests it.
    """
    # Normalise postcode for matching
    search = postcode.replace("-", "").replace(" ", "").upper().strip()

    raw_zones = get_raw_data()
    raw_zone  = next(
        (z for z in raw_zones if z["postcode"].replace(" ", "").upper().strip() == search),
        None,
    )
    if not raw_zone:
        raise HTTPException(status_code=404, detail=f"Postcode '{postcode}' not found")

    # Fetch weather data concurrently
    weather, forecast_slots = await asyncio.gather(
        get_weather_modifiers(),
        get_forecast_modifiers(slots=4),
    )

    # Score the zone under current weather so the AI prompt has the computed risk
    scored = score_zone(raw_zone, weather["impact_multiplier"])

    # Build forecast predictions for this zone (reuses last-step logic)
    zone_forecast = forecast_zone_risk(raw_zone, forecast_slots) if forecast_slots else []

    # Run synchronous Gemini call in a thread so we don't block the event loop
    try:
        analysis = await asyncio.to_thread(
            generate_fire_analysis, raw_zone, scored, weather, zone_forecast
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {"postcode": raw_zone["postcode"], "name": raw_zone["name"], "analysis": analysis}


@app.get("/api/zones/{postcode}", response_model=ZoneResponse)
async def get_zone(postcode: str):
    m = await get_weather_modifiers()
    zones = score_all_zones(m["impact_multiplier"])

    # 1. Normalize user input: remove all spaces and make uppercase
    # Example: "g31-3" OR "G31 3" -> "G313"
    search_term = postcode.replace("-", "").replace(" ", "").upper().strip()

    # 2. Normalize data comparison: remove all spaces from the JSON postcode too
    match = next(
        (z for z in zones if z["postcode"].replace(" ", "").upper().strip() == search_term),
        None
    )

    if not match:
        # Debugging: this helps you see exactly what the computer is comparing
        print(f"Failed match: '{search_term}' not found in {[z['postcode'] for z in zones]}")
        raise HTTPException(status_code=404, detail=f"Postcode '{postcode}' not found")

    return match


@app.get("/api/predict", response_model=list[ZoneSimulatedResponse])
async def predict(hour: int = Query(None, description="Hour 0-23 to simulate (defaults to current hour)")):
    m = await get_weather_modifiers()
    zones = score_all_zones(m["impact_multiplier"])

    enriched = run_ml(zones)

    target_hour = hour if hour is not None else datetime.now().hour
    overnight = target_hour >= 22 or target_hour < 6

    result = []
    for z in enriched:
        adjusted = min(z["composite_risk"] * 1.2, 10.0) if overnight else z["composite_risk"]
        result.append({
            **z,
            "simulated_hour": target_hour,
            "overnight_active": overnight,
            "simulated_risk": round(adjusted, 2),
            "simulated_risk_level": get_risk_level(adjusted),
        })

    return result


@app.get("/api/predict/hotspots", response_model=list[ZonePredictionResponse])
async def hotspots():
    m = await get_weather_modifiers()
    zones = score_all_zones(m["impact_multiplier"])

    enriched = run_ml(zones)
    sorted_zones = sorted(enriched, key=lambda z: z["predicted_risk"], reverse=True)
    return sorted_zones[:3]


# ── Static SPA serving ──────────────────────────────────────────────────────
# Mount the React build's assets directory so hashed JS/CSS files are served
# efficiently. The catch-all below handles all other paths by returning
# index.html so React Router can do client-side routing.

if os.path.isdir(STATIC_DIR):
    _assets = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="spa-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Serve real files that exist (favicon, manifest, etc.)
        candidate = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        # Fall back to index.html for all other paths (SPA routing)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))