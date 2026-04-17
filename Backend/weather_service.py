import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
import httpx

# Tell it to look in the parent directory (root) for the .env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("OPENWEATHER_API_KEY")
city = "GLASGOW"


def _compute_multiplier(temp: float, wind_speed: float, gusts: float, rain_mm: float, humidity: int) -> float:
    """Compute risk impact multiplier from weather factors."""
    temp_mult     = 1.2 if (temp > 28 or temp < 0) else 1.0
    wind_mult     = 1.3 if (wind_speed > 15 or gusts > 20) else 1.0
    # Rain suppresses fire spread; low humidity increases ignition risk
    rain_mult     = 0.75 if rain_mm > 2.0 else (0.9 if rain_mm > 0.5 else 1.0)
    humidity_mult = 1.15 if humidity < 30 else 1.0
    return round(temp_mult * wind_mult * rain_mult * humidity_mult, 2)


async def get_weather_modifiers():
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
        async with httpx.AsyncClient() as client:
            r = await client.get(url)
            data = r.json()

            temp       = data['main']['temp']
            wind_speed = data['wind']['speed']
            wind_deg   = data['wind'].get('deg', 0)
            gusts      = data['wind'].get('gust', wind_speed)
            humidity   = data['main'].get('humidity', 50)
            rain_mm    = data.get('rain', {}).get('1h', 0.0)

            return {
                "impact_multiplier": _compute_multiplier(temp, wind_speed, gusts, rain_mm, humidity),
                "wind_speed":        round(wind_speed, 1),
                "wind_direction":    wind_deg,
                "is_high_wind":      wind_speed > 15,
            }

    except Exception as e:
        print(f"Weather API failed: {e}")
        return {"impact_multiplier": 1.0, "wind_direction": 0, "is_high_wind": False}


async def get_forecast_modifiers(slots: int = 4) -> list:
    """
    Fetch weather forecast for the next ~12 hours (4 × 3-hour slots).
    Returns a list of dicts, each containing weather data and an impact_multiplier
    ready to be fed into forecast_zone_risk().
    Falls back to an empty list on failure so callers degrade gracefully.
    """
    try:
        url = (
            f"http://api.openweathermap.org/data/2.5/forecast"
            f"?q={city}&appid={api_key}&units=metric&cnt={slots}"
        )
        async with httpx.AsyncClient() as client:
            r = await client.get(url)
            data = r.json()

        results = []
        for item in data.get("list", []):
            temp       = item["main"]["temp"]
            wind_speed = item["wind"]["speed"]
            wind_deg   = item["wind"].get("deg", 0)
            gusts      = item["wind"].get("gust", wind_speed)
            humidity   = item["main"].get("humidity", 50)
            rain_mm    = item.get("rain", {}).get("3h", 0.0)
            description = item["weather"][0]["description"] if item.get("weather") else "unknown"

            dt_utc = datetime.fromtimestamp(item["dt"], tz=timezone.utc)

            results.append({
                "dt":               item["dt"],
                "hour_label":       dt_utc.strftime("%H:%M"),
                "impact_multiplier": _compute_multiplier(temp, wind_speed, gusts, rain_mm, humidity),
                "wind_speed":       round(wind_speed, 1),
                "wind_direction":   wind_deg,
                "wind_gust":        round(gusts, 1),
                "rain_mm":          round(rain_mm, 2),
                "temperature":      round(temp, 1),
                "humidity":         humidity,
                "description":      description,
                "is_high_wind":     wind_speed > 15,
            })

        return results

    except Exception as e:
        print(f"Forecast API failed: {e}")
        return []