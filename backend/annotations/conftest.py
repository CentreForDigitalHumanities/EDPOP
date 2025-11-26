import pytest


@pytest.fixture
def django_test_user(django_user_model):
    return django_user_model.objects.create_user(username='tester', password='secret')
