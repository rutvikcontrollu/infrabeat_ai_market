import requests


def get_github_projects(keyword):
    url = "https://api.github.com/search/repositories"

    params = {
        "q": keyword,
        "sort": "stars",
        "order": "desc",
        "per_page": 10
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        return {
            "count": 0,
            "projects": []
        }

    data = response.json()

    projects = []

    for item in data.get("items", []):
        projects.append({
            "name": item["name"],
            "stars": item["stargazers_count"],
            "url": item["html_url"]
        })

    return {
        "count": data.get("total_count", 0),
        "projects": projects
    }