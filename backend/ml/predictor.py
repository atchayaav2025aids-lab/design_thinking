def predict_risk(avg_marks: float, attendance_pct: float) -> str:
    """
    Rule-based risk predictor.
    Returns: 'high' | 'medium' | 'low'
    """
    if avg_marks < 40 or attendance_pct < 60:
        return "high"
    elif avg_marks < 60 or attendance_pct < 75:
        return "medium"
    else:
        return "low"
