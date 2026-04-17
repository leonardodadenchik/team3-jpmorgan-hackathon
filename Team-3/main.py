from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from risk_engine import score_all_zones, get_risk_level
 
app = FastAPI(title="Glasgow Hazard API")
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock this down before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# --- routes ---
 
@app.get("/api/zones")
def get_zones(
    risk: str = Query(None, description="Filter by risk level: critical, high, medium, low"),
    trigger: bool = Query(None, description="Filter to red zone trigger zones only")
):
    zones = score_all_zones()
    if risk:
        zones = [z for z in zones if z["risk_level"] == risk]
    if trigger is not None:
        zones = [z for z in zones if z["red_zone_trigger"] == trigger]
    return zones
 
@app.get("/api/zones/{postcode}")
def get_zone(postcode: str):
    zones = score_all_zones()
    postcode_clean = postcode.replace("-", " ").upper()
    match = next((z for z in zones if z["postcode"] == postcode_clean), None)
    if not match:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Zone not found")
    return match
 
@app.get("/api/summary")
def get_summary():
    zones = score_all_zones()
    return {
        "total_zones": len(zones),
        "critical": sum(1 for z in zones if z["risk_level"] == "critical"),
        "high": sum(1 for z in zones if z["risk_level"] == "high"),
        "medium": sum(1 for z in zones if z["risk_level"] == "medium"),
        "low": sum(1 for z in zones if z["risk_level"] == "low"),
        "red_zone_triggers": sum(1 for z in zones if z["red_zone_trigger"]),
    }