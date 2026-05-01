from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import f1_service
import os

app = FastAPI(title="F1 Dashboard")

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def index():
    return FileResponse(os.path.join("static", "index.html"))


@app.get("/api/seasons")
def seasons():
    return f1_service.get_seasons()


@app.get("/api/events/{year}")
def events(year: int):
    try:
        return f1_service.get_events(year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/drivers/{year}/{event}")
def drivers(year: int, event: str):
    try:
        return f1_service.get_drivers_in_session(year, event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/laps/{year}/{event}")
def laps(year: int, event: str):
    try:
        return f1_service.get_lap_times(year, event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/telemetry/{year}/{event}/{driver}")
def telemetry(year: int, event: str, driver: str):
    try:
        return f1_service.get_telemetry(year, event, driver.upper())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/strategy/{year}/{event}")
def strategy(year: int, event: str):
    try:
        return f1_service.get_tyre_strategy(year, event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/standings/{year}")
def standings(year: int):
    try:
        return f1_service.get_driver_standings(year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
