from django.urls import path

from projects import api

urlpatterns = [
    path('api/projects/', api.ProjectView.as_view({'get': 'list'})),
    path('api/projects/mine/', api.MyProjectsView.as_view({'get': 'list'})),
]
