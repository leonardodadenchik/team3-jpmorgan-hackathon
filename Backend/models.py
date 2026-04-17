from pydantic import BaseModel
from typing import Optional

# models for response validation to make them more explicit (fastapi loves)

class ScoresModel(BaseModel):
    building: float
    lithium: float
    human: float
    chemical: Optional[float]
    fire_infra: Optional[float]

class FireStationResponse(BaseModel):
    callsign: str
    name: str
    fullName: str
    type: str
    lat: float
    lng: float


class ZoneResponse(BaseModel):
    postcode: str
    name: str
    lat: float
    lng: float
    composite_risk: float
    confidence_score: float
    
    time_adjusted_risk: float
    risk_level: str
    red_zone_trigger: bool
    scores: ScoresModel


class ZonePredictionResponse(ZoneResponse):
    cluster: int
    cluster_label: str
    predicted_risk: float


class ZoneSimulatedResponse(ZonePredictionResponse):
    simulated_hour: int
    overnight_active: bool
    simulated_risk: float
    simulated_risk_level: str


class SummaryResponse(BaseModel):
    total_zones: int
    critical: int
    high: int
    medium: int
    low: int
    red_zone_triggers: int

class AIStructuredData(BaseModel):
    building_v: float
    lithium_v: float
    human_v: float
    confidence_score: float

class WeatherData(BaseModel):
    impact_multiplier: float
    wind_speed: float
    wind_direction: int
    is_high_wind: bool

class AnalysisResponse(BaseModel):
    structured_data: AIStructuredData
    calculated_risk: float
    is_red_zone: bool
    weather_impact: WeatherData
    reliability_score: float