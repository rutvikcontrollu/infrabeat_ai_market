"""
Google Trends signal via the unofficial pytrends library.

IMPORTANT: Google Trends has no official API. pytrends scrapes the public
endpoint, which Google rate-limits and may block (HTTP 429). Every function
here fails soft: on any error it returns `available: False` and the rest of
the app scores normally without a trend signal.

What we compute
---------------
- direction : "rising" | "stable" | "declining"  (5-year shape)
- trend_score : 0-100 where ~50 = flat, <50 = declining, >50 = rising
- change_pct : recent interest vs. earlier baseline, as a percentage
"""

from pytrends.request import TrendReq


def get_trend(keyword):
    result = {
        "available": False,
        "direction": "unknown",
        "trend_score": 50,
        "change_pct": 0,
    }

    try:
        pytrends = TrendReq(hl="en-US", tz=330, timeout=(4, 8))
        pytrends.build_payload([keyword], timeframe="today 5-y")
        df = pytrends.interest_over_time()

        if df is None or df.empty or keyword not in df.columns:
            return result

        series = df[keyword].dropna()
        if len(series) < 12:
            return result

        values = series.tolist()
        n = len(values)

        # Earlier baseline = first third; recent = last third
        third = max(n // 3, 1)
        early = values[:third]
        recent = values[-third:]

        early_avg = sum(early) / len(early) if early else 0
        recent_avg = sum(recent) / len(recent) if recent else 0

        # percentage change from early baseline to recent
        if early_avg > 0:
            change_pct = round(((recent_avg - early_avg) / early_avg) * 100)
        else:
            change_pct = 100 if recent_avg > 0 else 0

        # Map change_pct onto a 0-100 trend score centered at 50.
        # -100% (collapsed) -> ~0 ; +100% or more (doubled) -> ~100
        trend_score = 50 + (change_pct / 2)
        trend_score = max(0, min(round(trend_score), 100))

        if change_pct <= -25:
            direction = "declining"
        elif change_pct >= 25:
            direction = "rising"
        else:
            direction = "stable"

        result.update({
            "available": True,
            "direction": direction,
            "trend_score": trend_score,
            "change_pct": change_pct,
        })
        return result

    except Exception as e:
        print(f"Trend lookup failed: {e}")
        return result
