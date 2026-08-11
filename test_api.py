import requests

response = requests.post(
    "http://127.0.0.1:5000/analyze",
    json={
        "keyword": "3D Printer"
    }
)

print(response.json())