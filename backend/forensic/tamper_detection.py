from forensic.hashing import sha256_text
from forensic.manifest import flatten_json


def detect_field_tampering(
    original_manifest,
    current_data
):

    current_flat = flatten_json(current_data)

    tampered = []

    for field, metadata in original_manifest.items():

        expected_hash = metadata["hash"]

        current_value = current_flat.get(field)

        current_hash = sha256_text(current_value)

        if current_hash != expected_hash:

            tampered.append({

                "field":
                    field,

                "status":
                    "MODIFIED",

                "expected_hash":
                    expected_hash,

                "current_hash":
                    current_hash,

                "current_value":
                    current_value
            })

    return tampered


def detect_chunk_tampering(
    original_chunks,
    current_chunks
):

    current_map = {
        c["chunk_index"]: c
        for c in current_chunks
    }

    tampered = []

    for original in original_chunks:

        idx = original["chunk_index"]

        current = current_map.get(idx)

        if not current:
            continue

        if original["hash"] != current["hash"]:

            tampered.append({

                "chunk_index":
                    idx,

                "start_byte":
                    original["start_byte"],

                "end_byte":
                    original["end_byte"],

                "status":
                    "MODIFIED"
            })

    return tampered