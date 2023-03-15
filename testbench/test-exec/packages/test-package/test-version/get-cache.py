import json
import os

cache_content = json.loads(os.getenv("VELOCITAS_CACHE_DATA"))
print(cache_content)
