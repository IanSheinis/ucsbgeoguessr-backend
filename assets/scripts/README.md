source ./.venv/bin/activate

pip install -r requirements.txt

python wikidata_tourist_attractions
wikidata_tourist_attractions: This adds images and metadata to /images and /metadata
- Count is configurable in the python file

Add USER_AGENT to .env
I put "projectName/version (email)"
Wikidata requires this if you use their api constantly