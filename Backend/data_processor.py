from google import genai  # Note the change from 'generativeai'
import os
import json


def _gemini_client():
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def ai_standardize_data(raw_text):
    client = _gemini_client()

    prompt = f"""
        Convert urban data into a safety score JSON (1-10).
        Return ONLY JSON with these keys:
        "building_v", "lithium_v", "human_v", "confidence_score" (0.0 to 1.0)
        TEXT: {raw_text}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return json.loads(response.text)


def _compass(deg: int) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return dirs[round(deg / 45) % 8]


def generate_fire_analysis(raw_zone: dict, scored_zone: dict, weather: dict, forecast: list) -> str:
    """
    Ask Gemini to narrate how a fire would develop at this location given all
    available hazard, infrastructure, and weather data.

    Returns plain text with four section headers (IGNITION, SPREAD,
    OCCUPANT IMPACT, CREW RESPONSE) and an optional WEATHER OUTLOOK section.
    """
    bv  = raw_zone["building_vulnerability"]
    ls  = raw_zone["lithium_sources"]
    hv  = raw_zone["human_vulnerability"]
    fi  = raw_zone["fire_infrastructure"]
    cp  = raw_zone["chemical_proximity"]

    red = "· RED ZONE TRIGGER" if scored_zone.get("red_zone_trigger") else ""
    stairwell_warn = "⚠ CHARGING IN STAIRWELLS — evacuation route compromised" if ls.get("charging_in_stairwells") else ""

    # Forecast trend summary
    if forecast:
        first_risk = forecast[0]["risk_score"]
        last_risk  = forecast[-1]["risk_score"]
        delta = last_risk - first_risk
        trend = "RISING" if delta > 0.5 else "FALLING" if delta < -0.5 else "STABLE"
        forecast_line = (
            f"Forecast risk {first_risk} → {last_risk} ({trend}) over next 12h. "
            + " | ".join(
                f"{s['hour_label']} {s['risk_score']} wind {s['wind_speed']}m/s rain {s['rain_mm']}mm"
                for s in forecast
            )
        )
    else:
        forecast_line = "Forecast unavailable."

    pool_str  = "swimming pool (chlorine storage) nearby" if cp.get("swimming_pool_nearby") else ""
    oil_str   = "oil storage nearby"                      if cp.get("oil_storage_nearby")   else ""
    chem_list = ", ".join(filter(None, [pool_str, oil_str, cp.get("notes", "")]))

    prompt = f"""You are an operational fire risk analyst for Scottish Fire & Rescue Service.
Write a fire development scenario for the following Glasgow zone using ONLY the data provided.
Structure your response with exactly these section headings on their own lines, followed by one paragraph each:

IGNITION
SPREAD
OCCUPANT IMPACT
CREW RESPONSE
WEATHER OUTLOOK

Each paragraph should be 2-3 sentences, specific and operational. Reference actual figures (distances, counts, building type). No bullet points. No markdown. Total length: 220-270 words.

ZONE: {raw_zone['name']} ({raw_zone['postcode']})
RISK SCORE: {scored_zone['composite_risk']}/10 — {scored_zone['risk_level'].upper()} {red}

BUILDING: {bv['type']}, {bv['age']}, {bv['floors']} floors, {'shared stairwell' if bv.get('shared_stairwell') else 'no shared stairwell'}
Notes: {bv.get('notes', 'none')}

LITHIUM SOURCES: {ls['ebikes_registered']} e-bikes · {ls['ebike_chargers']} e-bike chargers · {ls['electric_cars']} EVs · {ls['ev_chargers']} EV charge points · {ls['escooters']} e-scooters
{stairwell_warn}
Notes: {ls.get('notes', 'none')}

HUMAN VULNERABILITY: {hv['elderly_pct']}% elderly residents · deprivation decile {hv['deprivation_decile']}
Notes: {hv.get('notes', 'none')}

FIRE INFRASTRUCTURE: {fi['nearest_station_km']} km to nearest station · {fi['hydrant_count']} hydrants · {fi['access_rating']} vehicle access

CHEMICAL HAZARDS: {chem_list if chem_list else 'none noted'}

CURRENT WEATHER: {weather.get('wind_speed', '?')} m/s wind from {_compass(weather.get('wind_direction', 0))} · {weather.get('temperature', '?')}°C · description: {weather.get('description', 'unknown')}

{forecast_line}
"""

    client = _gemini_client()
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
    except Exception as e:
        raise RuntimeError(f"Gemini API error: {e}") from e
    return response.text.strip()