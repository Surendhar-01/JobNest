import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.core import settings
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def use_local_database(monkeypatch):
    monkeypatch.setattr(settings, 'SUPABASE_URL', '')
    monkeypatch.setattr(settings, 'ANON_KEY', '')
    monkeypatch.setattr(settings, 'SERVICE_KEY', '')


def login(role):
    response = client.post('/api/auth/demo-login', json={'role': role})
    assert response.status_code == 200
    return response.json()


def test_admin_endpoints_require_administrator_role():
    student = login('student')
    headers = {'Authorization': f"Bearer {student['token']}"}

    assert client.get('/api/admin/dashboard', headers=headers).status_code == 403
    assert client.get('/api/admin/audit-logs', headers=headers).status_code == 403


def test_admin_lists_are_filtered_and_source_secrets_are_omitted():
    admin = login('admin')
    headers = {'Authorization': f"Bearer {admin['token']}"}

    users = client.get('/api/admin/users', params={'q': 'admin@pathfinder.io'}, headers=headers)
    assert users.status_code == 200
    assert users.json()['total'] >= 1
    assert all('password_hash' not in row for row in users.json()['items'])

    sources = client.get('/api/admin/sources', headers=headers)
    assert sources.status_code == 200
    for source in sources.json()['items']:
        assert 'config' not in source
        assert 'configuration_status' in source


def test_admin_cannot_deactivate_own_account():
    admin = login('admin')
    headers = {'Authorization': f"Bearer {admin['token']}"}
    admin_id = admin['user']['id']

    response = client.patch(f'/api/admin/users/{admin_id}', json={'is_active': False}, headers=headers)
    assert response.status_code == 409


def test_deactivated_user_is_denied_api_access():
    admin = login('admin')
    student = login('student')
    admin_headers = {'Authorization': f"Bearer {admin['token']}"}
    student_headers = {'Authorization': f"Bearer {student['token']}"}
    student_id = student['user']['id']

    try:
        response = client.patch(
            f'/api/admin/users/{student_id}',
            json={'is_active': False},
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.json()['is_active'] is False
        assert client.get('/api/users/me', headers=student_headers).status_code == 403
        login_response = client.post(
            '/api/auth/login',
            json={'email': student['user']['email'], 'password': 'DemoPassword123!'}
        )
        assert login_response.status_code == 403
    finally:
        client.patch(
            f'/api/admin/users/{student_id}',
            json={'is_active': True},
            headers=admin_headers
        )
