from fastapi.testclient import TestClient
from app.config import settings
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-service"

def test_conflict_printer_scenario():
    """Scenario 1: Two students competing for 1 free 3D printer slot."""
    payload = {
        "slot": {
            "id": "slot-printer-1",
            "resourceId": "res-printer-1",
            "resourceName": "Ultimaker 3D Printer",
            "department": "Engineering",
            "startTime": "2026-10-29T14:00:00Z",
            "endTime": "2026-10-29T16:00:00Z",
            "capacity": 1,
            "slotType": "free",
            "creditCost": 0
        },
        "requests": [
            {
                "id": "req-alice",
                "userId": "usr-alice",
                "userName": "Alice",
                "department": "Engineering",
                "requestedSlotId": "slot-printer-1",
                "sessionsThisMonth": 0,
                "waitingHours": 40.0,
                "projectNeedScore": 9.0,
                "isPriorityGroup": False,
                "trainingVerified": True,
                "currentCreditBalance": 10,
                "freeSessionsLeft": 3,
                "submittedAt": "2026-10-29T09:00:00Z"
            },
            {
                "id": "req-bob",
                "userId": "usr-bob",
                "userName": "Bob",
                "department": "Engineering",
                "requestedSlotId": "slot-printer-1",
                "sessionsThisMonth": 3,
                "waitingHours": 10.0,
                "projectNeedScore": 6.0,
                "isPriorityGroup": False,
                "trainingVerified": True,
                "currentCreditBalance": 10,
                "freeSessionsLeft": 1,
                "submittedAt": "2026-10-29T10:00:00Z"
            }
        ]
    }

    response = client.post("/allocate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Alice should win due to fewer sessions and higher need
    assert len(data["allocated"]) == 1
    assert data["allocated"][0]["requestId"] == "req-alice"
    assert len(data["waitlist"]) == 1
    assert data["waitlist"][0]["requestId"] == "req-bob"
    assert data["audit"]["capacity"] == 1
    assert data["audit"]["eligibleRequests"] == 2

def test_insights_endpoint():
    response = client.get("/insights?demo=true")
    assert response.status_code == 200
    data = response.json()
    assert "equipmentUtilization" in data
    assert "giniCoefficient" in data
    assert len(data["narrative"]) == 3
