from rest_framework import viewsets
from django.contrib.auth.models import User, AnonymousUser

from projects.models import Project
from projects.serializers import ProjectSerializer

def user_projects(user: User):
    if user.is_superuser:
        return Project.objects.all()

    if isinstance(user, AnonymousUser):
        return Project.objects.none()

    direct_access = Project.objects.filter(users=user)
    access_through_group = Project.objects.filter(groups__user=user)
    return direct_access.union(access_through_group)

class ProjectView(viewsets.ReadOnlyModelViewSet):
    '''
    List all projects
    '''

    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user

        public = Project.objects.filter(public=True)
        with_access = user_projects(user)

        return public.union(with_access)


class MyProjectsView(ProjectView):
    '''
    List all projects in which the user can add collections and annotations
    '''

    def get_queryset(self):
        user = self.request.user
        return user_projects(user)
