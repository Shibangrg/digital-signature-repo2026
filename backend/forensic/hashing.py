import hashlib
import json


def sha256_text(value):

    if value is None:
        value = "null"

    return hashlib.sha256(
        str(value).encode("utf-8")
    ).hexdigest()


def sha256_bytes(data: bytes):

    return hashlib.sha256(data).hexdigest()


def canonical_json(data):

    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":")
    )


def canonical_hash(data):

    return sha256_text(
        canonical_json(data)
    )