import json
import os

cache_value = json.loads(os.getenv("VELOCITAS_CACHE_DATA"))["my_cache_key"]
print(os.getenv("VELOCITAS_CACHE_DATA"))
print(f"Cache value: {cache_value}")
