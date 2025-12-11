import pytest

from projects.models import Project


@pytest.fixture
def django_test_user(django_user_model):
    return django_user_model.objects.create_user(username='tester', password='secret')


@pytest.fixture()
def project(db, django_test_user):
    project = Project.objects.create(
        name='project',
        display_name='Project',
    )
    project.users.add(django_test_user)
    project.save()
    return project
