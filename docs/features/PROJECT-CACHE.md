# Project Cache

Every _Velocitas_ project maintained by the CLI has its own project cache.
This cache can be used to store temporary values or files which shall not be part of the main repository, such as generated
files or arbitrary key-value pairs.

## Cache usage

Programs executed via the CLI's `exec` command have read and write access to the cache. Due to the complexity of the topic, reading and writing of the cache is handled by the CLI.

---

<p style="color:red;">
Bear in mind that you are <strong>always</strong> working in context of a single <i>Velocitas</i> project <strong>only</strong>. You cannot set global cache values which are applicable for all your <i>Velocitas</i> projects.
</p>

---

Invoked programs may interact with the cache in the following ways:

### Writing values

To write values to the project cache, any program can simply write

```
my_key=my_value >> VELOCITAS_CACHE
```

to the stdout. Any line printed in this fashion is intercepted by the CLI and `my_key` associated with `my_value` will be written to the project's cache.

Examples:

**Bash**
```bash
echo "myKey=myValue >> VELOCITAS_CACHE"
```

**Python 3**
```python
print("myKey=myValue >> VELOCITAS_CACHE")
```

### Reading values

To read values from the cache, programs may read the `VELOCITAS_CACHE_DATA` environment variable. It contains a the entire cache data as JSON-string.

Programs may use whatever JSON library is suitable to parse this string and access any contained value.

Examples:

**Bash**
```bash
# jq tool required
MY_CACHE_VALUE=$(echo $VELOCITAS_CACHE_DATA | jq .my_key | tr -d '"')

echo "${MY_CACHE_VALUE}"
```

**Python 3**
```python
import json

my_cache_value = json.loads(os.getenv('VELOCITAS_CACHE_DATA'))['my_key']
print(f"{my_cache_value}")
```

## Environment variables exposed by the CLI

For a list of all cache variables exposed by the CLI, have a look at the variable overview [here](./VARIABLES.md).
