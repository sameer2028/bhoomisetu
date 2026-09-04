import requests
import json
import time

URL = "http://localhost:8000/api/ai/process-document"
payload = {
    "file_url": "https://res.cloudinary.com/ydcu4zhw/image/upload/v1788528830/nla_documents/gyttxtek5dlhzcmvermu.jpg",
    "official_parcel": {
        "survey_number": "123/2",
        "area_acres": 2.10,
        "village": "Sastaf kchas",
        "owner_name": "Rameshway Kumay Shaym",
        "district": "Lucknow"
    }
}

print(f"Testing {URL}...")
start_time = time.time()
try:
    response = requests.post(URL, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body:\n{json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
print(f"Took {time.time() - start_time:.2f} seconds")
