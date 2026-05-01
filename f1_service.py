import os
import fastf1
import pandas as pd
from functools import lru_cache

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

AVAILABLE_SEASONS = list(range(2018, 2026))

TYRE_COLORS = {
    "SOFT": "#e8002d",
    "MEDIUM": "#ffd700",
    "HARD": "#efefef",
    "INTERMEDIATE": "#39b54a",
    "WET": "#0067ff",
    "UNKNOWN": "#999999",
}


def _load_session(year: int, event: str, session_type: str = "R") -> fastf1.core.Session:
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    event_row = schedule[schedule["EventName"].str.contains(event, case=False, na=False)]
    if event_row.empty:
        raise ValueError(f"Event '{event}' not found in {year}")
    round_number = int(event_row.iloc[0]["RoundNumber"])
    session = fastf1.get_session(year, round_number, session_type)
    session.load(telemetry=True, weather=False, messages=False)
    return session


def get_seasons() -> list[int]:
    return AVAILABLE_SEASONS


def get_events(year: int) -> list[dict]:
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    events = []
    for _, row in schedule.iterrows():
        events.append({
            "round": int(row["RoundNumber"]),
            "name": row["EventName"],
            "country": row.get("Country", ""),
            "date": str(row["EventDate"].date()) if pd.notna(row["EventDate"]) else "",
        })
    return events


def get_lap_times(year: int, event: str) -> list[dict]:
    session = _load_session(year, event, "R")
    laps = session.laps[["Driver", "LapNumber", "LapTime", "Compound", "IsPersonalBest"]].copy()
    laps = laps.dropna(subset=["LapTime"])
    laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()
    result = []
    for _, row in laps.iterrows():
        result.append({
            "driver": row["Driver"],
            "lap": int(row["LapNumber"]),
            "time_s": round(float(row["LapTimeSeconds"]), 3),
            "compound": str(row["Compound"]) if pd.notna(row["Compound"]) else "UNKNOWN",
            "personal_best": bool(row["IsPersonalBest"]) if pd.notna(row["IsPersonalBest"]) else False,
        })
    return result


def get_telemetry(year: int, event: str, driver: str) -> dict:
    session = _load_session(year, event, "R")
    driver_laps = session.laps.pick_drivers(driver)
    if driver_laps.empty:
        raise ValueError(f"Driver '{driver}' not found")
    fastest = driver_laps.pick_fastest()
    tel = fastest.get_telemetry()
    tel = tel[["Distance", "Speed", "Throttle", "Brake", "DRS", "nGear"]].dropna(subset=["Distance", "Speed"])
    return {
        "driver": driver,
        "distance": tel["Distance"].round(1).tolist(),
        "speed": tel["Speed"].round(1).tolist(),
        "throttle": tel["Throttle"].round(1).tolist(),
        "brake": tel["Brake"].astype(int).tolist(),
        "drs": tel["DRS"].astype(int).tolist(),
        "gear": tel["nGear"].astype(int).tolist(),
    }


def get_tyre_strategy(year: int, event: str) -> list[dict]:
    session = _load_session(year, event, "R")
    laps = session.laps[["Driver", "LapNumber", "Compound", "Stint"]].copy()
    laps = laps.dropna(subset=["Compound"])

    result = []
    for driver in laps["Driver"].unique():
        driver_laps = laps[laps["Driver"] == driver]
        stints = []
        for stint_num, stint_laps in driver_laps.groupby("Stint"):
            stints.append({
                "stint": int(stint_num),
                "compound": str(stint_laps["Compound"].iloc[0]),
                "start_lap": int(stint_laps["LapNumber"].min()),
                "end_lap": int(stint_laps["LapNumber"].max()),
                "laps": int(len(stint_laps)),
                "color": TYRE_COLORS.get(str(stint_laps["Compound"].iloc[0]), "#999999"),
            })
        result.append({"driver": driver, "stints": stints})
    return result


def get_driver_standings(year: int) -> list[dict]:
    try:
        ergast = fastf1.ergast.Ergast()
        standings = ergast.get_driver_standings(season=year, round="last")
        if standings.content and len(standings.content) > 0:
            df = standings.content[0]
            result = []
            for _, row in df.iterrows():
                result.append({
                    "position": int(row["position"]),
                    "driver": f"{row['givenName']} {row['familyName']}",
                    "code": row.get("driverCode", row["familyName"][:3].upper()),
                    "team": row["constructorNames"][0] if row["constructorNames"] else "",
                    "points": float(row["points"]),
                    "wins": int(row["wins"]),
                })
            return result
    except Exception:
        pass
    return []


def get_drivers_in_session(year: int, event: str) -> list[str]:
    session = _load_session(year, event, "R")
    return sorted(session.laps["Driver"].unique().tolist())
