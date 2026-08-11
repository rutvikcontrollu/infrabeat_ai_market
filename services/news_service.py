import requests
import xml.etree.ElementTree as ET


def get_news_count(keyword):

    url = f"https://news.google.com/rss/search?q={keyword}"

    try:
        response = requests.get(url, timeout=10)

        root = ET.fromstring(response.content)

        items = root.findall(".//item")

        return len(items)

    except Exception:
        return 0