import json
from datetime import datetime, timezone
import os
import numpy as np

# This makes the path relative to the Backend folder
base_path = os.path.dirname(__file__)
file_path = os.path.join(base_path, 'glasgow_hazard_data_v2.json')

with open(file_path) as f:
    RAW_ZONES = json.load(f)["zones"]

WEIGHTS = {
    "building": 0.20,
    "lithium": 0.35,
    "human": 0.25,
    "chemical": 0.10,
    "fire_infra": 0.10,
}
def get_raw_data():
    with open(file_path) as x:
        return json.load(x)["zones"]

def get_risk_level(score: float) -> str:
    if score >= 7.5:
        return "critical"
    elif score >= 6.0:
        return "high"
    elif score >= 4.0:
        return "medium"
    else:
        return "low"


def score_zone(zone: dict, weather_multiplier: float = 1.0) -> dict:
    building = zone["building_vulnerability"]["score"]
    lithium = zone["lithium_sources"]["score"]
    human = zone["human_vulnerability"]["score"]
    chemical = zone["chemical_proximity"]["score"]
    fire_infra = zone["fire_infrastructure"]["score"]
    # Apply weather multiplier to the composite
    # Use the WEIGHTS dictionary and the multiplier
    composite = (
                        building * WEIGHTS["building"] +
                        lithium * WEIGHTS["lithium"] +
                        human * WEIGHTS["human"] +
                        chemical * WEIGHTS["chemical"] +
                        fire_infra * WEIGHTS["fire_infra"]
                ) * weather_multiplier

    # Ensure composite doesn't exceed 10.0
    composite = min(composite, 10.0)

    # Stairwell bump
    if zone["lithium_sources"].get("charging_in_stairwells", False):
        composite = min(composite * 1.1, 10.0)

    # Overnight multiplier (22:00 - 06:00)
    hour = datetime.now().hour
    if hour >= 22 or hour < 6:
        time_adjusted = min(composite * 1.2, 10.0)
    else:
        time_adjusted = composite

    red_zone_trigger = building >= 7 and lithium >= 7

    return {
        "postcode": zone["postcode"],
        "name": zone["name"],
        "lat": zone["lat"],
        "lng": zone["lng"],
        "composite_risk": round(composite, 2),
        "confidence_score": zone.get("confidence_score", 1.0),
        "time_adjusted_risk": round(time_adjusted, 2),
        "risk_level": get_risk_level(composite),
        "red_zone_trigger": red_zone_trigger,
        "scores": {
            "building": building,
            "lithium": lithium,
            "human": human,
            "chemical": chemical,
            "fire_infra": fire_infra,
        }
    }


def calculate_ahp_risk(scores, weather_multiplier=1.0):
    # Your AHP Weights (Must sum to 1.0)
    weights = np.array([0.35, 0.40, 0.25])  # [Building, Lithium, Human]

    # The Raw Scores from AI
    score_vector = np.array([
        scores['building_v'],
        scores['lithium_v'],
        scores['human_v']
    ])

    # Calculate weighted average
    base_risk = np.dot(score_vector, weights)

    # Apply the live weather "danger" multiplier
    final_risk = base_risk * weather_multiplier

    # Non-linear "Red Zone" override
    is_red = (scores['building_v'] >= 7 and scores['lithium_v'] >= 7)

    return round(final_risk, 2), is_red

def score_all_zones(weather_multiplier: float = 1.0) -> list:
    return [score_zone(z, weather_multiplier) for z in RAW_ZONES]


def forecast_zone_risk(zone: dict, forecast_list: list) -> list:
    """
    Given a raw zone dict and a list of forecast weather slots (from
    weather_service.get_forecast_modifiers), return a list of predicted risk
    snapshots — one per forecast slot.

    Each slot carries the weather context so the frontend can explain *why*
    the risk is changing (wind picking up, rain clearing, overnight, etc.).
    """
    building   = zone["building_vulnerability"]["score"]
    lithium    = zone["lithium_sources"]["score"]
    human      = zone["human_vulnerability"]["score"]
    chemical   = zone["chemical_proximity"]["score"]
    fire_infra = zone["fire_infrastructure"]["score"]
    in_stairwell = zone["lithium_sources"].get("charging_in_stairwells", False)

    base = (
        building   * WEIGHTS["building"] +
        lithium    * WEIGHTS["lithium"] +
        human      * WEIGHTS["human"] +
        chemical   * WEIGHTS["chemical"] +
        fire_infra * WEIGHTS["fire_infra"]
    )

    predictions = []
    for slot in forecast_list:
        composite = min(base * slot["impact_multiplier"], 10.0)

        if in_stairwell:
            composite = min(composite * 1.1, 10.0)

        # Overnight hours (22:00–06:00 UTC) carry a 1.2× sleeping-occupant penalty
        dt_utc = datetime.fromtimestamp(slot["dt"], tz=timezone.utc)
        overnight = dt_utc.hour >= 22 or dt_utc.hour < 6
        if overnight:
            composite = min(composite * 1.2, 10.0)

        predictions.append({
            "dt":               slot["dt"],
            "hour_label":       slot["hour_label"],
            "risk_score":       round(composite, 2),
            "risk_level":       get_risk_level(composite),
            "wind_speed":       slot["wind_speed"],
            "wind_direction":   slot["wind_direction"],
            "wind_gust":        slot["wind_gust"],
            "rain_mm":          slot["rain_mm"],
            "temperature":      slot["temperature"],
            "humidity":         slot["humidity"],
            "description":      slot["description"],
            "overnight":        overnight,
        })

    return predictions

# Backend/risk_engine.py

def get_unified_confidence(ai_conf: float, ml_conf: float) -> float:
    # Weighted average: 70% source data quality, 30% model fit
    unified = (ai_conf * 0.7) + (ml_conf * 0.3)
    return round(unified, 2)


if __name__ == "__main__":
    for z in score_all_zones():
        print(z["postcode"], z["risk_level"], z["composite_risk"], "TRIGGER" if z["red_zone_trigger"] else "")