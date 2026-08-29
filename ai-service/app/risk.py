"""
risk.py

Transparent, rule-based project risk scoring.

This is NOT a trained ML model. The score is calculated using four
explainable factors:

1. Overdue cases                 -> max 30 points
2. Pending compensation          -> max 30 points
3. Unresolved AI mismatches      -> max 25 points
4. R&R delays                    -> max 15 points

Total possible score = 100.

The output matches the expected risk_scores structure:

{
    "score": float,
    "risk_level": str,
    "factors": {
        ...
    }
}
"""

from typing import Any


# ---------------------------------------------------------------------------
# WEIGHTS
# ---------------------------------------------------------------------------
# These are policy decisions and should be easy to explain to judges/admins.
WEIGHTS = {
    "overdue_cases": 30.0,
    "pending_compensation": 30.0,
    "unresolved_mismatches": 25.0,
    "rr_delays": 15.0,
}

TOTAL_MAX_SCORE = sum(WEIGHTS.values())


# ---------------------------------------------------------------------------
# RISK LEVEL THRESHOLDS
# ---------------------------------------------------------------------------
RISK_LEVEL_THRESHOLDS = [
    (75.0, "CRITICAL"),
    (50.0, "HIGH"),
    (25.0, "MEDIUM"),
    (0.0, "LOW"),
]


# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------
def _safe_non_negative(value: Any) -> float:
    """
    Convert a value to float and prevent negative values.

    Invalid/non-numeric values are treated as 0.
    """
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return 0.0


def _safe_ratio(numerator: float, denominator: float) -> float:
    """
    Calculate numerator / denominator safely.

    The returned ratio is always constrained to [0, 1].

    Examples:
        0 / 100   -> 0.0
        25 / 100  -> 0.25
        100 / 100 -> 1.0
        150 / 100 -> 1.0   (clamped)
        anything / 0 -> 0.0
    """
    if denominator <= 0:
        return 0.0

    ratio = numerator / denominator
    return min(max(ratio, 0.0), 1.0)


# ---------------------------------------------------------------------------
# MAIN FUNCTION
# ---------------------------------------------------------------------------
def calculate_risk_score(project_data: dict) -> dict:
    """
    Calculate the project risk score.

    Expected project_data:

        total_cases: int
        overdue_cases: int

        total_compensation_assessed: float
        total_compensation_paid: float

        unresolved_mismatches: int
        total_mismatches: int

        total_rr_activities: int
        completed_rr_activities: int

    Returns:
        {
            "score": float,
            "risk_level": str,
            "factors": dict
        }
    """

    if not isinstance(project_data, dict):
        raise TypeError("project_data must be a dictionary")

    factors = {}

    # ---------------------------------------------------------------
    # 1. Overdue Cases
    # ---------------------------------------------------------------
    overdue_points, overdue_detail = _score_overdue_cases(project_data)
    factors["overdue_cases"] = overdue_detail

    # ---------------------------------------------------------------
    # 2. Pending Compensation
    # ---------------------------------------------------------------
    compensation_points, compensation_detail = (
        _score_pending_compensation(project_data)
    )
    factors["pending_compensation"] = compensation_detail

    # ---------------------------------------------------------------
    # 3. Unresolved AI Mismatches
    # ---------------------------------------------------------------
    mismatch_points, mismatch_detail = (
        _score_unresolved_mismatches(project_data)
    )
    factors["unresolved_mismatches"] = mismatch_detail

    # ---------------------------------------------------------------
    # 4. R&R Delays
    # ---------------------------------------------------------------
    rr_points, rr_detail = _score_rr_delays(project_data)
    factors["rr_delays"] = rr_detail

    # ---------------------------------------------------------------
    # Final Score
    # ---------------------------------------------------------------
    total_score = round(
        overdue_points
        + compensation_points
        + mismatch_points
        + rr_points,
        2,
    )

    # Final safety clamp.
    total_score = min(max(total_score, 0.0), TOTAL_MAX_SCORE)

    risk_level = _risk_level_for_score(total_score)

    return {
        "score": total_score,
        "risk_level": risk_level,
        "factors": factors,
    }


# ---------------------------------------------------------------------------
# FACTOR 1: OVERDUE CASES
# ---------------------------------------------------------------------------
def _score_overdue_cases(data: dict) -> tuple[float, dict]:
    """
    Formula:

        overdue_ratio = overdue_cases / total_cases

        overdue_points =
            overdue_ratio * 30
    """

    total = _safe_non_negative(data.get("total_cases", 0))
    overdue = _safe_non_negative(data.get("overdue_cases", 0))

    # Overdue cases cannot logically exceed total cases.
    overdue = min(overdue, total)

    overdue_ratio = _safe_ratio(overdue, total)

    points = round(
        overdue_ratio * WEIGHTS["overdue_cases"],
        2,
    )

    return points, {
        "overdue_cases": int(overdue),
        "total_cases": int(total),
        "overdue_pct": round(overdue_ratio * 100, 1),
        "points_contributed": points,
        "max_points": WEIGHTS["overdue_cases"],
    }


# ---------------------------------------------------------------------------
# FACTOR 2: PENDING COMPENSATION
# ---------------------------------------------------------------------------
def _score_pending_compensation(data: dict) -> tuple[float, dict]:
    """
    Formula:

        pending = assessed - paid

        pending_ratio = pending / assessed

        compensation_points =
            pending_ratio * 30

    Example:
        Assessed = 10 crore
        Paid     = 7 crore

        Pending = 3 crore

        Pending ratio = 3 / 10 = 0.30

        Points = 0.30 * 30 = 9
    """

    assessed = _safe_non_negative(
        data.get("total_compensation_assessed", 0)
    )

    paid = _safe_non_negative(
        data.get("total_compensation_paid", 0)
    )

    # Payment cannot logically exceed assessed compensation.
    paid = min(paid, assessed)

    pending = max(0.0, assessed - paid)

    pending_ratio = _safe_ratio(pending, assessed)

    points = round(
        pending_ratio * WEIGHTS["pending_compensation"],
        2,
    )

    return points, {
        "compensation_assessed": assessed,
        "compensation_paid": paid,
        "compensation_pending": pending,
        "pending_pct": round(pending_ratio * 100, 1),
        "points_contributed": points,
        "max_points": WEIGHTS["pending_compensation"],
    }


# ---------------------------------------------------------------------------
# FACTOR 3: UNRESOLVED AI MISMATCHES
# ---------------------------------------------------------------------------
def _score_unresolved_mismatches(data: dict) -> tuple[float, dict]:
    """
    Formula:

        unresolved_ratio =
            unresolved_mismatches / total_mismatches

        mismatch_points =
            unresolved_ratio * 25
    """

    unresolved = _safe_non_negative(
        data.get("unresolved_mismatches", 0)
    )

    total = _safe_non_negative(
        data.get("total_mismatches", 0)
    )

    # Unresolved mismatches cannot logically exceed total mismatches.
    unresolved = min(unresolved, total)

    unresolved_ratio = _safe_ratio(unresolved, total)

    points = round(
        unresolved_ratio * WEIGHTS["unresolved_mismatches"],
        2,
    )

    return points, {
        "unresolved_mismatches": int(unresolved),
        "total_mismatches": int(total),
        "unresolved_pct": round(unresolved_ratio * 100, 1),
        "points_contributed": points,
        "max_points": WEIGHTS["unresolved_mismatches"],
    }


# ---------------------------------------------------------------------------
# FACTOR 4: R&R DELAYS
# ---------------------------------------------------------------------------
def _score_rr_delays(data: dict) -> tuple[float, dict]:
    """
    Formula:

        incomplete = total_rr_activities - completed_rr_activities

        incomplete_ratio =
            incomplete / total_rr_activities

        rr_points =
            incomplete_ratio * 15
    """

    total = _safe_non_negative(
        data.get("total_rr_activities", 0)
    )

    completed = _safe_non_negative(
        data.get("completed_rr_activities", 0)
    )

    # Completed activities cannot exceed total activities.
    completed = min(completed, total)

    incomplete = max(0.0, total - completed)

    incomplete_ratio = _safe_ratio(incomplete, total)

    points = round(
        incomplete_ratio * WEIGHTS["rr_delays"],
        2,
    )

    return points, {
        "total_rr_activities": int(total),
        "completed_rr_activities": int(completed),
        "incomplete_rr_activities": int(incomplete),
        "incomplete_pct": round(incomplete_ratio * 100, 1),
        "points_contributed": points,
        "max_points": WEIGHTS["rr_delays"],
    }


# ---------------------------------------------------------------------------
# RISK LEVEL
# ---------------------------------------------------------------------------
def _risk_level_for_score(score: float) -> str:
    """
    Convert a numerical risk score into a risk category.

        0  - 24.99  -> LOW
        25 - 49.99  -> MEDIUM
        50 - 74.99  -> HIGH
        75 - 100    -> CRITICAL
    """

    score = min(max(float(score), 0.0), TOTAL_MAX_SCORE)

    for threshold, level in RISK_LEVEL_THRESHOLDS:
        if score >= threshold:
            return level

    # This should never be reached because 0.0 is the lowest threshold.
    return "LOW"
