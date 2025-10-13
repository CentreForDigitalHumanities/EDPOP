from django.test import Client


def test_project_list_view_anonymous(db, public_project, private_project, client: Client):
    response = client.get('/api/projects/')
    assert response.status_code == 200
    assert len(response.data) == 1

def test_project_list_view_authenticated(db, public_project, private_project, user_1, client: Client):
    client.force_login(user_1)
    response = client.get('/api/projects/')
    assert response.status_code == 200
    assert len(response.data) == 2

def test_project_mine_view(db, public_project, private_project, user_1, client: Client):
    response = client.get('/api/projects/mine/')
    assert response.status_code == 200
    assert len(response.data) == 0

    client.force_login(user_1)

    response = client.get('/api/projects/mine/')
    assert response.status_code == 200
    assert len(response.data) == 2
