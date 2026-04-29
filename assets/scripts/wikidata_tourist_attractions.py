"""
This script takes famous tourist attractions from wikidata and puts them to assets/metadata
It then takes the image url from wikimedia, and downloads it to assets/images

Useful sources:
Extracting Data from Wikidata Using SPARQL and Python
https://itnext.io/extracting-data-from-wikidata-using-sparql-and-python-59e0037996f

How to create a WikiData SPARQL Query
https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/Query_Helper
"""

from lib.wiki_data_query_results import WikiDataQueryResults
from lib.image_download import download_image
from urllib.parse import unquote
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

### Config ###
IMG_COUNT = 2      # Image query count
IMG_WIDTH = 1024    # Image pixel width
USER_AGENT = os.environ["USER_AGENT"]  # required by Wikimedia
METADATA_DIR = "metadata"
REQUEST_DELAY_SEC = 1.0       # be polite to Wikimedia servers

SCRIPT_DIR = Path(__file__).parent
ASSETS_DIR = SCRIPT_DIR.parent
IMAGES_DIR = ASSETS_DIR / "images"
METADATA_DIR = ASSETS_DIR / "metadata"

"""
From SPARQL Query Builder: https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/Query_Helper

-
Filter: instance of tourist attraction
Show: image, coordinate location, country
-

Added DISTINCT after Query Builder created my Query to prevent duplicate img names
"""
query = query = f"""
SELECT DISTINCT ?tourist_attraction ?tourist_attractionLabel ?image ?coordinate_location ?country ?countryLabel 
WHERE {{
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],mul,en". }}
  ?tourist_attraction wdt:P31 wd:Q570116.
  OPTIONAL {{ ?tourist_attraction wdt:P18 ?image. }}
  OPTIONAL {{ ?tourist_attraction wdt:P625 ?coordinate_location. }}
  OPTIONAL {{ ?tourist_attraction wdt:P17 ?country. }}
}}
LIMIT {IMG_COUNT}
"""

# Make query
data_extracter = WikiDataQueryResults(query, USER_AGENT)
tourist_attractions = data_extracter.load_as_dict()

"""
Metadata contains:

tourist_attraction — Wikidata entity URL
image — Wikimedia Commons image URL
coordinate_location — coordinates as Point(lon lat)
country — country's Wikidata entity URL
tourist_attractionLabel — human-readable name
countryLabel — human-readable country name
"""
# Loop through metadata, download the image and add it to ../images, then add the corresponding metadata to ../metadata
for row in tourist_attractions:
    metadata = [] # metadata obj
    print(row)

    # Add image to /images
    img_url = row["image"]
    img_name = unquote(img_url.rsplit("/", 1)[-1]) # Extract img name from img url
    download_image(img_url, str(IMAGES_DIR / img_name), USER_AGENT)

    # Add metadata to /metadata
