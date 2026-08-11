import os
from serpapi import GoogleSearch


def get_products(keyword, limit=6):
    """
    Returns a list of products for the given keyword using
    SerpAPI's Google Shopping engine. Each product has:
    title, image, price, source, link (buy URL).
    """

    api_key = os.getenv("SERPAPI_KEY")

    if not api_key:
        return []

    params = {
        "engine": "google_shopping",
        "q": keyword,
        "api_key": api_key,
        "num": limit,
        "gl": "in",   # country: India. Change as needed.
        "hl": "en",
    }

    try:
        search = GoogleSearch(params)
        data = search.get_dict()

        items = data.get("shopping_results", [])

        products = []

        for item in items[:limit]:
            link = (
                item.get("product_link")
                or item.get("link")
                or ""
            )

            products.append({
                "title": item.get("title", "Unknown"),
                "image": item.get("thumbnail", ""),
                "price": item.get("price", "N/A"),
                "source": item.get("source", ""),
                "rating": item.get("rating"),
                "link": link,
            })

        return products

    except Exception as e:
        print(f"Product search failed: {e}")
        return []
