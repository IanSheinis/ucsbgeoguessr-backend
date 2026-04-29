import json
from pathlib import Path

REQUIRED_KEYS = {"imgName", "Location", "Latitude", "Longitude", "Categories"}


def validate_entry(entry: dict) -> None:
    """Raise ValueError if entry is missing required keys."""
    missing = REQUIRED_KEYS - entry.keys()
    if missing:
        raise ValueError(f"Entry missing required keys: {missing}")


def add_to_json(json_path: Path, entry: dict) -> bool:
    """
    Add an entry to the JSON config if its imgName isn't already present.
    Returns True if added, False if already existed.
    """
    validate_entry(entry)
    
    # Open prexisting json file
    if json_path.exists():
        with open(json_path) as f:
            config = json.load(f)
    else:
        config = []
    
    # Make sure img name is not already present
    existing_names = {item["imgName"] for item in config}
    if entry["imgName"] in existing_names:
        return False
    
    # Write to json file
    config.append(entry)
    with open(json_path, "w") as f:
        json.dump(config, f, indent=2)
    return True