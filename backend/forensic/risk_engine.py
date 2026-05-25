def calculate_integrity_score(
    total_fields,
    tampered_fields
):

    if total_fields == 0:
        return 100

    clean = (
        total_fields -
        len(tampered_fields)
    )

    return round(
        (clean / total_fields) * 100,
        2
    )


def classify_risk(score):

    if score >= 95:
        return "LOW"

    if score >= 75:
        return "MEDIUM"

    if score >= 50:
        return "HIGH"

    return "CRITICAL"