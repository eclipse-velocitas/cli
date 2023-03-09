import json
import os

cache_value = json.loads(os.getenv("VELOCITAS_CACHE_DATA"))
print(cache_value)
