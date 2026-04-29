import requests

def download_image(url: str, path: str, user_agent: str, timeout: int = 30) -> None:
    """Download an image from a URL to a local file path."""
    r = requests.get(url, headers={"User-Agent": user_agent}, timeout=timeout)
    r.raise_for_status() # catches error
    with open(path, "wb") as f:
        f.write(r.content)