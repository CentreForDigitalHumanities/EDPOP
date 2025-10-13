import pytest
from django.contrib.auth.models import User, AnonymousUser

from projects.models import Project

@pytest.mark.parametrize('project_name,username,can_query,can_update', [
    ('public', 'tester_added_directly', True, True),
    ('public', 'tester_not_added', True, False),
    ('public', 'tester_added_through_group', True, True),
    ('public', None, True, False),
    ('private', 'tester_added_directly', True, True),
    ('private', 'tester_not_added', False, False),
    ('private', 'tester_added_through_group', True, True),
    ('private', None, False, False)
])
def test_project_access(
    test_data, project_name, username, can_query, can_update
):
    project = Project.objects.get(name=project_name)

    if username:
        user = User.objects.get(username=username)
    else:
        user = AnonymousUser()

    assert project.permit_query_by(user) == can_query
    assert project.permit_update_by(user) == can_update
