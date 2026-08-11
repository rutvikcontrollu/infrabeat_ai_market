"""
Market scoring logic.

Design notes
------------
Market signals are exponentially distributed: a popular keyword can have 100x
the repos/stars of a quiet one. Linear bucketing (e.g. count // 100) loses all
resolution at the high end and flattens everything small to zero. So we
log-scale the raw inputs onto a 0-100 range with sensible saturation points.

- demand_score      : how much total interest/activity exists (repos + news + stars)
- competition_score : how saturated / dominated the space is (concentration of stars)
- opportunity_score : demand discounted by competition, not a raw subtraction
"""

import math


def _log_scale(value, full_at):
    """
    Map `value` onto 0-100 using a log curve that reaches ~100 at `full_at`.
    value=0 -> 0 ; value=full_at -> ~100 ; grows fast early, saturates late.
    """
    if value <= 0:
        return 0
    score = 100 * math.log1p(value) / math.log1p(full_at)
    return max(0, min(round(score), 100))


def compute_scores(project_count, news_count, top_projects, trend=None):
    """
    Returns a dict with demand_score, competition_score, opportunity_score,
    verdict, and the component breakdown (useful for transparency in the UI).

    `trend` is an optional dict from trend_service.get_trend(). When available,
    it modulates demand: a declining search trend pulls demand down, a rising
    one lifts it. This is what stops declining categories (e.g. physical media)
    from reading as high-demand just because they still have code/news volume.
    """

    stars = [p.get("stars", 0) for p in top_projects]
    total_stars = sum(stars)
    top_star = max(stars) if stars else 0

    # ---- Demand: interest signals (repos, news, aggregate stars) ----
    repo_demand = _log_scale(project_count, full_at=20000)   # 20k repos ~ saturated interest
    news_demand = _log_scale(news_count, full_at=100)        # Google RSS tops out ~100
    star_demand = _log_scale(total_stars, full_at=200000)    # 200k stars across top 5 = huge

    # weighted blend: repos and stars matter more than raw news volume
    demand_raw = round(
        0.45 * repo_demand + 0.20 * news_demand + 0.35 * star_demand
    )
    demand_raw = max(0, min(demand_raw, 100))

    # ---- Trend modulation ----
    # A search-interest trend reweights demand. trend_score 50 = neutral (x1.0);
    # a collapsed trend (0) scales demand to ~0.55x, a doubled trend (100) to
    # ~1.25x. This is the fix for "still has code/news volume but nobody buys it":
    # declining real-world interest now visibly drags the demand score down.
    trend_available = bool(trend and trend.get("available"))
    trend_score = trend.get("trend_score", 50) if trend else 50
    if trend_available:
        factor = 0.55 + (trend_score / 100) * 0.7   # 0.55 .. 1.25
        demand_score = round(demand_raw * factor)
        demand_score = max(0, min(demand_score, 100))
    else:
        demand_score = demand_raw

    # ---- Competition: saturation / dominance ----
    # A space is "competitive" when there are many projects AND a few giants
    # dominate the stars. We blend breadth (repo count) with concentration
    # (how big the single biggest player is).
    breadth = _log_scale(project_count, full_at=30000)
    dominance = _log_scale(top_star, full_at=120000)         # one 120k-star repo = entrenched leader

    competition_score = round(0.5 * breadth + 0.5 * dominance)
    competition_score = max(0, min(competition_score, 100))

    # ---- Opportunity: demand you can actually capture ----
    # High demand is only valuable if you can break in. We discount demand by
    # competition, but gently — a busy, open market should still score well.
    # The discount floors at 0.4 so strong demand is never fully erased, and
    # we add a small bonus for the sweet spot: real demand + low competition.
    capture = 1 - (competition_score / 100) * 0.6   # max 60% discount
    opportunity_score = demand_score * max(capture, 0.4)

    # sweet-spot bonus: meaningful demand with room to enter
    if demand_score >= 35 and competition_score <= 60:
        opportunity_score += 12

    opportunity_score = round(opportunity_score)
    opportunity_score = max(0, min(opportunity_score, 100))

    # ---- Verdict ----
    # Low opportunity has distinct causes worth naming differently:
    # a declining market, a crowded one, or one with little interest.
    direction = trend.get("direction") if trend_available else None

    if trend_available and direction == "declining" and opportunity_score < 45:
        verdict = "DECLINING MARKET"
    elif opportunity_score >= 50:
        verdict = "EXCELLENT OPPORTUNITY"
    elif opportunity_score >= 28:
        verdict = "GOOD OPPORTUNITY"
    elif competition_score >= 60:
        verdict = "HIGH COMPETITION"
    else:
        verdict = "LOW DEMAND"

    return {
        "demand_score": demand_score,
        "competition_score": competition_score,
        "opportunity_score": opportunity_score,
        "verdict": verdict,
        "trend": {
            "available": trend_available,
            "direction": direction or "unknown",
            "trend_score": trend_score if trend_available else None,
            "change_pct": trend.get("change_pct") if trend_available else None,
        },
        "breakdown": {
            "repo_demand": repo_demand,
            "news_demand": news_demand,
            "star_demand": star_demand,
            "demand_before_trend": demand_raw,
            "breadth": breadth,
            "dominance": dominance,
            "total_stars": total_stars,
            "top_star": top_star,
        },
    }
