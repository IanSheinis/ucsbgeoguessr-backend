"""
This script takes famous tourist attractions from wikidata and puts them to assets/metadata and assets/images

Useful sources:
Extracting Data from Wikidata Using SPARQL and Python
https://itnext.io/extracting-data-from-wikidata-using-sparql-and-python-59e0037996f

How to create a WikiData SPARQL Query
https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/Query_Helper
"""

from lib.WikiDataQueryResults import WikiDataQueryResults
import os
from dotenv import load_dotenv
load_dotenv()
### Config ###
IMG_COUNT = 2      # Image query count
IMG_WIDTH = 1024    # Image pixel width
USER_AGENT = os.environ["USER_AGENT"]  # required by Wikimedia
IMAGES_DIR = "images"
METADATA_DIR = "metadata"
REQUEST_DELAY_SEC = 1.0       # be polite to Wikimedia servers

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

data_extracter = WikiDataQueryResults(query, USER_AGENT)
df = data_extracter.load_as_dict()
print(df)