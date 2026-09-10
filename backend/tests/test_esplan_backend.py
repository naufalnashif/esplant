"""Backend surface tests for Esplan.

Esplan intentionally has ~no server-side storage. Only /api/health and /api/ should exist.
The old /api/state endpoints (POST/GET) leaked one shared finance state across users and
must remain removed (return 404).
"""
import os
import httpx
import pytest

PUBLIC_URL = "https://1032d28b-a216-4a1a-b68f-60af37dc2c9c.preview.emergentagent.com"
BASE = os.environ.get("REACT_APP_BACKEND_URL", PUBLIC_URL).rstrip("/")


@pytest.fixture(scope="module")
def public_client():
    with httpx.Client(base_url=BASE, timeout=30.0) as c:
        yield c


# --- health & root ---
class TestHealth:
    def test_health_ok(self, public_client):
        r = public_client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"

    def test_api_root(self, public_client):
        r = public_client.get("/api/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert data.get("persists_user_data") is False


# --- privacy regression: /api/state must NOT exist ---
class TestStateEndpointsRemoved:
    def test_get_state_returns_404(self, public_client):
        r = public_client.get("/api/state")
        assert r.status_code == 404

    def test_post_state_returns_404(self, public_client):
        r = public_client.post("/api/state", json={"foo": "bar"})
        assert r.status_code == 404
