"""
Web Search Service — replaces github_service.py

Uses SerpAPI's Google Organic Search engine to discover real-world
information about a keyword: how many results exist, what the top pages
look like, and whether any notable products/companies appear in snippets.

Return shape (same contract as the old github_service):
{
    "count"    : int,       # estimated total results (from SerpAPI search_information)
    "projects" : [          # top organic results (replaces GitHub repo list)
        {
            "name"    : str,   # page / company / product name
            "snippet" : str,   # short description from Google snippet
            "url"     : str,   # link
            "source"  : str,   # domain / site name
        },
        ...
    ]
}

The `count` figure feeds into scoring the same way project_count did
(it is log-scaled, so the huge numbers from Google are handled safely).
The `projects` list feeds the "top_projects" section of the UI; the
frontend already renders name + url, so renaming the key is not needed.
"""

import os
from serpapi import GoogleSearch


def get_web_results(keyword, limit: int = 10):
    """
    Search Google for `keyword` and return organic result count + top pages.

    Falls back gracefully (returns zeros / empty list) if the API key is
    missing or the request fails.
    """
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        return {"count": 0, "projects": []}

    params = {
        "engine": "google",
        "q": keyword,
        "api_key": api_key,
        "num": limit,
        "hl": "en",
        "gl": "us",
    }

    try:
        search = GoogleSearch(params)
        data = search.get_dict()

        # Total estimated results (e.g. "About 4,320,000,000 results")
        search_info = data.get("search_information", {})
        total_results = search_info.get("total_results", 0)
        # SerpAPI returns this as an int already, but guard against strings
        try:
            total_results = int(total_results)
        except (TypeError, ValueError):
            total_results = 0

        organic = data.get("organic_results", [])

        projects = []
        for item in organic[:limit]:
            projects.append({
                "name":    item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "url":     item.get("link", ""),
                "source":  item.get("displayed_link", ""),
            })

        return {"count": total_results, "projects": projects}

    except Exception as e:
        print(f"[web_search_service] Search failed: {e}")
        return {"count": 0, "projects": []}
