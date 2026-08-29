"""
risk.py

Calculates project-level risk scores based on four weighted factors:
1. Overdue Statutory Cases (Max 35 points)
2. Pending Compensation Disbursement (Max 25 points)
3. Rehabilitation & Resettlement Delays (Max 20 points)
4. AI Cadastral Document Discrepancies (Max 20 points)

Total Score = 0 - 100
Risk Levels:
- LOW: 0 - 39
- MEDIUM: 40 - 64
- HIGH: 65 - 100
"""

from typing import Dict, Any, Tuple


def calculate_risk_score(
    overdue_cases_count: int = 0,
    total_assessed_comp: float = 0.0,
    total_paid_comp: float = 0.0,
    delayed_rr_count: int = 0,
    open_mismatches_count: int = 0,
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Computes weighted risk score and returns (score, risk_level, factor_breakdown).
    """
    # 1. Overdue Cases Factor (Max 35 pts)
    if overdue_cases_count == 0:
        case_score = 5.0
        case_label = "All statutory workflow cases on schedule"
    elif overdue_cases_count == 1:
        case_score = 15.0
        case_label = "1 statutory case approaching/past deadline"
    elif overdue_cases_count == 2:
        case_score = 25.0
        case_label = "2 statutory cases overdue past statutory deadline"
    else:
        case_score = 35.0
        case_label = f"{overdue_cases_count} statutory cases overdue past statutory deadline"

    # 2. Pending Compensation Factor (Max 25 pts)
    if total_assessed_comp > 0:
        unpaid = max(0.0, total_assessed_comp - total_paid_comp)
        unpaid_ratio = unpaid / total_assessed_comp
        comp_score = round(min(25.0, unpaid_ratio * 25.0), 1)
        if unpaid > 0:
            comp_cr = unpaid / 10000000.0  # 1 Crore = 10,000,000
            comp_label = f"₹{comp_cr:.2f} Cr pending compensation disbursement"
        else:
            comp_label = "Compensation disbursements fully cleared"
    else:
        comp_score = 8.0
        comp_label = "Initial compensation assessment underway"

    # 3. R&R Delays Factor (Max 20 pts)
    if delayed_rr_count == 0:
        rr_score = 4.0
        rr_label = "No rehabilitation disputes or delays logged"
    elif delayed_rr_count == 1:
        rr_score = 12.0
        rr_label = "1 rehabilitation activity delayed"
    else:
        rr_score = 20.0
        rr_label = f"{delayed_rr_count} rehabilitation/resettlement activities delayed"

    # 4. AI Document Mismatches Factor (Max 20 pts)
    if open_mismatches_count == 0:
        mismatch_score = 3.0
        mismatch_label = "All cadastral title documents verified"
    elif open_mismatches_count == 1:
        mismatch_score = 10.0
        mismatch_label = "1 active cadastral document discrepancy"
    else:
        mismatch_score = 20.0
        mismatch_label = f"{open_mismatches_count} active cadastral document discrepancies"

    total_score = round(min(100.0, case_score + comp_score + rr_score + mismatch_score), 1)

    if total_score >= 65.0:
        risk_level = "HIGH"
    elif total_score >= 40.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    factors = {
        "overdue_cases": {
            "score": case_score,
            "max": 35.0,
            "count": overdue_cases_count,
            "label": case_label,
        },
        "pending_compensation": {
            "score": comp_score,
            "max": 25.0,
            "label": comp_label,
        },
        "rr_issues": {
            "score": rr_score,
            "max": 20.0,
            "count": delayed_rr_count,
            "label": rr_label,
        },
        "document_mismatches": {
            "score": mismatch_score,
            "max": 20.0,
            "count": open_mismatches_count,
            "label": mismatch_label,
        },
    }

    return total_score, risk_level, factors
