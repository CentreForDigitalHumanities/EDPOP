from rest_framework import permissions

from projects.models import Project

class CollectionPermission(permissions.BasePermission):
    '''
    Checks whether the user has access to read or write a collection.
    '''
    
    def has_object_permission(self, request, view, obj):
        project_uri = obj.project
        project = Project.objects.get(uri=project_uri)

        if request.method in permissions.SAFE_METHODS:
            return project.permit_query_by(request.user)
        else:
            return project.permit_update_by(request.user)
