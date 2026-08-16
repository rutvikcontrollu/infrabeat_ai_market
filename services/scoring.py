"""
Market scoring logic.

Design notes
------------
Market signals are exponentially distributed: a popular keyword can have
orders of magnitude more web results than a quiet one. Linear bucketing
loses resolution at the high end, so we log-scale raw inputs onto 0-100
with sensible saturation points.

- demand_score      : how much total interest/activity exists
                      (web result count + news + number of result titles)
- competition_score : how saturated the space is
                      (breadth of web presence + richness of top results)
- opportunity_score : demand discounted by competition

Changes from the old GitHub-based version
------------------------------------------
- `project_count` / `total_stars` / `top_star` → gone.
- New input `web_count`  : total Google results for the keyword.
- New input `top_results`: list of dicts with at least {"name", "snippet"}.
  Used to gauge how rich / commercialised the top results look.
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


def _richness(top_results):
    """
    0-100 score for how informative / commercial the top pages look.
    Heuristic: count results that have a non-empty snippet (Google only
    suppresses snippets for very thin / blocked pages).
    """
    if not top_results:
        return 0
    with_snippet = sum(1 for r in top_results if r.get("snippet", "").strip())
    return round(100 * with_snippet / len(top_results))


def compute_scores(web_count, news_count, top_results, trend=None):
    """
    Returns a dict with demand_score, competition_score, opportunity_score,
    verdict, and the component breakdown (useful for transparency in the UI).

    Parameters
    ----------
    web_count    : int   — estimated Google total results for the keyword
    news_count   : int   — news article count (unchanged from before)
    top_results  : list  — top organic results from web_search_service
    trend        : dict  — optional trend dict from trend_service.get_trend()

    Return dict shape is identical to the old version so app.py stays lean.
    """

    # ---- Demand: interest signals (web volume, news, result richness) ----
    # Google returns billions of results for broad terms; saturate at 1 billion.
    web_demand  = _log_scale(web_count, full_at=1_000_000_000)
    news_demand = _log_scale(news_count, full_at=100)           # RSS tops ~100
    rich_score  = _richness(top_results)                        # 0-100 already

    # weighted blend
    demand_raw = round(
        0.45 * web_demand + 0.25 * news_demand + 0.30 * rich_score
    )
    demand_raw = max(0, min(demand_raw, 100))

    # ---- Trend modulation (unchanged) ----
    trend_available = bool(trend and trend.get("available"))
    trend_score = trend.get("trend_score", 50) if trend else 50
    if trend_available:
        factor = 0.55 + (trend_score / 100) * 0.7   # 0.55 .. 1.25
        demand_score = round(demand_raw * factor)
        demand_score = max(0, min(demand_score, 100))
    else:
        demand_score = demand_raw

    # ---- Competition: how crowded / established the space is ----
    # Breadth = how many results exist; dominance = how polished the top pages are.
    breadth   = _log_scale(web_count, full_at=2_000_000_000)   # higher ceiling
    dominance = rich_score                                       # rich results → big players

    competition_score = round(0.55 * breadth + 0.45 * dominance)
    competition_score = max(0, min(competition_score, 100))

    # ---- Opportunity: demand you can actually capture ----
    capture = 1 - (competition_score / 100) * 0.6   # max 60% discount
    opportunity_score = demand_score * max(capture, 0.4)

    # sweet-spot bonus: real demand + room to enter
    if demand_score >= 35 and competition_score <= 60:
        opportunity_score += 12

    opportunity_score = round(opportunity_score)
    opportunity_score = max(0, min(opportunity_score, 100))

    # ---- Verdict ----
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
        "demand_score":      demand_score,
        "competition_score": competition_score,
        "opportunity_score": opportunity_score,
        "verdict":           verdict,
        "trend": {
            "available":   trend_available,
            "direction":   direction or "unknown",
            "trend_score": trend_score if trend_available else None,
            "change_pct":  trend.get("change_pct") if trend_available else None,
        },
        "breakdown": {
            "web_demand":          web_demand,
            "news_demand":         news_demand,
            "richness":            rich_score,
            "demand_before_trend": demand_raw,
            "breadth":             breadth,
            "dominance":           dominance,
            "web_count":           web_count,
        },
    }
