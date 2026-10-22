import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "semantic_model" in data

def test_list_jobs_and_filters():
    response = client.get("/api/jobs")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] > 0
    first_job = data["items"][0]
    assert "id" in first_job
    assert "title" in first_job

    # Test single job detail
    job_id = first_job["id"]
    detail_res = client.get(f"/api/jobs/{job_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == first_job["title"]

    # Test filters endpoint
    filters_res = client.get("/api/jobs/filters")
    assert filters_res.status_code == 200
    filters = filters_res.json()
    assert "department" in filters

def test_student_and_admin_auth_and_dashboards():
    # 1. Test Demo Student Login
    res = client.post("/api/auth/demo-login", json={"role": "student"})
    assert res.status_code == 200
    student_data = res.json()
    token = student_data["token"]
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test /api/users/me
    me_res = client.get("/api/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "student"

    # 3. Test Student Dashboard
    dash_res = client.get("/api/users/me/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert "profile_completion" in dash
    assert "matching_jobs" in dash

    # 4. Test Demo Admin Login
    admin_res = client.post("/api/auth/demo-login", json={"role": "admin"})
    assert admin_res.status_code == 200
    admin_token = admin_res.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 5. Test Admin Dashboard
    admin_dash_res = client.get("/api/admin/dashboard", headers=admin_headers)
    assert admin_dash_res.status_code == 200
    admin_dash = admin_dash_res.json()
    assert admin_dash["users"] >= 1
    assert admin_dash["jobs"] >= 1

def test_ai_recommendations_workflow():
    # Login as demo student
    res = client.post("/api/auth/demo-login", json={"role": "student"})
    headers = {"Authorization": f"Bearer {res.json()['token']}"}

    # Generate recommendations
    gen_res = client.post("/api/recommendations/generate", headers=headers)
    assert gen_res.status_code == 200
    data = gen_res.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) > 0

    first_rec = data["items"][0]
    assert "score" in first_rec
    assert "explanation" in first_rec
    assert "matching_skills" in first_rec["explanation"]

def test_saved_jobs_and_applications():
    res = client.post("/api/auth/demo-login", json={"role": "student"})
    headers = {"Authorization": f"Bearer {res.json()['token']}"}

    jobs = client.get("/api/jobs").json()["items"]
    job_id = jobs[0]["id"]

    # Save job
    save_res = client.post("/api/saved-jobs", json={"job_id": job_id}, headers=headers)
    assert save_res.status_code == 200

    # List saved jobs
    list_saved = client.get("/api/saved-jobs", headers=headers)
    assert list_saved.status_code == 200
    saved_ids = [item["job_id"] for item in list_saved.json()["items"]]
    assert job_id in saved_ids

    # Unsave
    del_res = client.delete(f"/api/saved-jobs/{job_id}", headers=headers)
    assert del_res.status_code == 200

def test_resume_upload_and_nlp_analysis():
    res = client.post("/api/auth/demo-login", json={"role": "student"})
    headers = {"Authorization": f"Bearer {res.json()['token']}"}

    # Minimal valid PDF with text stream
    pdf_content = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"5 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Alex Morgan Bachelor of Technology Computer Science Python React SQL) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000233 00000 n \n0000000305 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n478\n%%EOF\n"
    )

    upload_res = client.post(
        "/api/resumes/upload",
        files={"file": ("resume.pdf", pdf_content, "application/pdf")},
        headers=headers
    )
    assert upload_res.status_code == 201
    resume_id = upload_res.json()["id"]

    # Trigger analysis
    analyze_res = client.post("/api/resumes/analyze", json={"resume_id": resume_id}, headers=headers)
    assert analyze_res.status_code == 200
    analysis = analyze_res.json()["analysis"]
    assert "skills" in analysis
    assert "Python" in analysis["skills"]
    assert "React" in analysis["skills"]

def test_admin_scraping_trigger():
    from unittest.mock import patch
    admin_res = client.post("/api/auth/demo-login", json={"role": "admin"})
    admin_headers = {"Authorization": f"Bearer {admin_res.json()['token']}"}

    with patch("app.api.routes.collect_claimed") as mock_collect:
        scrape_res = client.post("/api/admin/scraping/run", json={"source_id": "fake-jobs"}, headers=admin_headers)
        assert scrape_res.status_code == 202
        assert scrape_res.json()["status"] == "running"
        mock_collect.assert_called_once()

