from flask import Flask, jsonify, request
from flask_cors import CORS

from services.web_search_service import get_web_results   # replaces github_service
from services.news_service import get_news_count
from services.product_service import get_products
from services.trend_service import get_trend
from services.scoring import compute_scores

from groq import Groq
import os
import time
import threading

from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
CORS(app)

# GROQ CLIENT
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ============================================================
# Simple in-memory cache  (keyword -> (timestamp, result))
# Avoids hammering SerpAPI / Groq for repeat searches.
# ============================================================
CACHE_TTL = 60 * 60          # 1 hour
_cache = {}
_cache_lock = threading.Lock()


def cache_get(key):
    with _cache_lock:
        entry = _cache.get(key)
        if not entry:
            return None
        ts, value = entry
        if time.time() - ts > CACHE_TTL:
            _cache.pop(key, None)
            return None
        return value


def cache_set(key, value):
    with _cache_lock:
        _cache[key] = (time.time(), value)


# ============================================================
# Lightweight rate limiter  (per client IP)
# ============================================================
RATE_LIMIT = 20              # requests
RATE_WINDOW = 60            # per 60 seconds
_hits = {}
_hits_lock = threading.Lock()


def rate_limited(ip):
    now = time.time()
    with _hits_lock:
        hits = [t for t in _hits.get(ip, []) if now - t < RATE_WINDOW]
        if len(hits) >= RATE_LIMIT:
            _hits[ip] = hits
            return True
        hits.append(now)
        _hits[ip] = hits
        return False


# ============================================================
# Routes
# ============================================================
@app.route("/")
def home():
    return jsonify({
        "project": "InfraBeat",
        "status": "running",
        "version": "3.2 AI"
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    # --- rate limit ---
    ip = request.headers.get("X-Forwarded-For", request.remote_addr) or "anon"
    if rate_limited(ip):
        return jsonify({
            "error": "Too many requests. Please wait a moment and try again."
        }), 429

    data = request.get_json(silent=True) or {}
    keyword = data.get("keyword", "").strip()

    if not keyword:
        return jsonify({"error": "Please enter a keyword to analyze."}), 400

    if len(keyword) > 100:
        return jsonify({"error": "Keyword is too long."}), 400

    # --- cache hit ---
    cache_key = keyword.lower()
    cached = cache_get(cache_key)
    if cached:
        cached = dict(cached)
        cached["cached"] = True
        return jsonify(cached)

    # --------------------------
    # Data gathering (each source fails soft)
    # --------------------------
    warnings = []

    try:
        web_data = get_web_results(keyword)
        web_count = web_data.get("count", 0)
        top_results = web_data.get("projects", [])[:10]
    except Exception:
        web_count, top_results = 0, []
        warnings.append("Web search data unavailable")

    try:
        news_count = get_news_count(keyword)
    except Exception:
        news_count = 0
        warnings.append("News data unavailable")

    try:
        products = get_products(keyword)
    except Exception:
        products = []
        warnings.append("Product data unavailable")

    try:
        trend = get_trend(keyword)
        if not trend.get("available"):
            warnings.append("Trend data unavailable")
    except Exception:
        trend = None
        warnings.append("Trend data unavailable")

    # --------------------------
    # Scoring
    # --------------------------
    scores = compute_scores(web_count, news_count, top_results, trend=trend)
    demand_score      = scores["demand_score"]
    competition_score = scores["competition_score"]
    opportunity_score = scores["opportunity_score"]
    verdict           = scores["verdict"]

    # --------------------------
    # GROQ AI REPORT
    # --------------------------
    trend_info = scores.get("trend", {})
    if trend_info.get("available"):
        trend_line = (
            f"- Search Interest Trend: {trend_info['direction']} "
            f"({trend_info['change_pct']:+d}% over 5 years)"
        )
    else:
        trend_line = "- Search Interest Trend: not available"

    prompt = f"""
You are a senior startup consultant and market analyst.

Analyze the following business category.

Keyword: {keyword}

Market Data:
- Google Web Results: {web_count:,}
- News Articles: {news_count}
- Demand Score: {demand_score}/100
- Competition Score: {competition_score}/100
- Opportunity Score: {opportunity_score}/100
- Verdict: {verdict}
{trend_line}

Instructions:
- Use simple business language.
- Avoid using the word "niche"; use "market", "business category", or "industry segment".
- Keep explanations practical and easy to understand.
- If the search interest trend is declining, treat this as a serious warning sign and reflect it honestly in the Market Summary and Risks; do not call a declining market a strong opportunity.
- If the trend is rising, highlight the growth momentum.
- Give realistic startup suggestions.
- Use proper headings and bullet points.
- For Market Value, cite specific dollar figures, growth rates (CAGR), and projected year. If exact figures are unavailable, give a credible estimated range.
- For Best Makers, name the actual leading companies and products in this space — be specific and current (e.g., company names, flagship products, market-share leaders).
- For Potential Customers, segment the audience clearly (e.g., SME, enterprise, consumer, developer) with concrete real-world examples.
- For Key Investment Signals, highlight 2–3 facts that make this market compelling or cautionary for investors.

Generate the following sections in this exact order:

## Market Summary
## Market Value
## Potential Customers
## Best Makers
## Opportunity Analysis
## Target Audience
## Revenue Model
## Key Investment Signals
## Risks
## Startup Ideas (3)

Make the report professional and investor-friendly.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )
        ai_report = response.choices[0].message.content
    except Exception as e:
        ai_report = (
            "## Market Summary\n\n"
            "The AI report could not be generated right now "
            f"({str(e)[:120]}). The market metrics above are still valid — "
            "try regenerating in a moment."
        )
        warnings.append("AI report unavailable")

    result = {
        "keyword":           keyword,
        "web_results":       web_count,         # replaces github_projects
        "news_articles":     news_count,
        "demand_score":      demand_score,
        "competition_score": competition_score,
        "opportunity_score": opportunity_score,
        "verdict":           verdict,
        "ai_report":         ai_report,
        "top_results":       top_results,        # replaces top_projects
        "products":          products,
        "trend":             scores.get("trend", {}),
        "breakdown":         scores["breakdown"],
        "warnings":          warnings,
        "cached":            False,
    }

    cache_set(cache_key, result)
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
