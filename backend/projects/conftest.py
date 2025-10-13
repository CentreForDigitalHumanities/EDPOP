from django.contrib.auth.models import User, Group
import pytest

from projects.models import Project

@pytest.fixture()
def group(db):
    return Group.objects.create(name='testers')


@pytest.fixture()
def user_1(db):
    return User.objects.create(
        username='tester_added_directly',
        password='secret'
    )


@pytest.fixture()
def user_2(db):
    return User.objects.create(
        username='tester_not_added',
        password='secret'
    )

@pytest.fixture()
def user_3(db, group):
    user = User.objects.create(
        username='tester_added_through_group',
        password='secret'
    )
    user.groups.add(group)
    user.save()
    return user

@pytest.fixture()
def public_project(db, user_1, group):
    project = Project.objects.create(
        name='public',
        display_name='Public',
        public=True,
    )
    project.users.add(user_1)
    project.groups.add(group)
    project.save()
    return project


@pytest.fixture()
def private_project(db, user_1, group):
    project = Project.objects.create(
        name='private',
        display_name='Private',
    )
    project.users.add(user_1)
    project.groups.add(group)
    project.save()
    return project

@pytest.fixture()
def test_data(group, user_1, user_2, user_3, public_project, private_project):
    return
