from forensic.hashing import sha256_text


def flatten_json(data, parent=""):

    items = {}

    if isinstance(data, dict):

        for key, value in data.items():

            path = (
                f"{parent}.{key}"
                if parent
                else key
            )

            if isinstance(value, dict):

                items.update(
                    flatten_json(value, path)
                )

            elif isinstance(value, list):

                for idx, item in enumerate(value):

                    item_path = f"{path}[{idx}]"

                    if isinstance(item, (dict, list)):

                        items.update(
                            flatten_json(item, item_path)
                        )

                    else:

                        items[item_path] = item

            else:

                items[path] = value

    return items


def create_integrity_manifest(data):

    flat = flatten_json(data)

    manifest = {}

    for field, value in flat.items():

        manifest[field] = {

            "hash":
                sha256_text(value),

            "type":
                type(value).__name__
        }

    return manifest