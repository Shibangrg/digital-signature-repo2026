import hashlib


CHUNK_SIZE = 4096


def create_chunk_manifest(file_bytes):

    chunks = []

    total = len(file_bytes)

    for offset in range(0, total, CHUNK_SIZE):

        chunk = file_bytes[
            offset:offset + CHUNK_SIZE
        ]

        chunks.append({

            "chunk_index":
                offset // CHUNK_SIZE,

            "start_byte":
                offset,

            "end_byte":
                offset + len(chunk),

            "hash":
                hashlib.sha256(chunk).hexdigest()
        })

    return chunks