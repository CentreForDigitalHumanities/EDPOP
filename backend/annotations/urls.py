from django.urls import path, re_path

from . import api

urlpatterns = [
    path('api/annotations/add/', api.AddAnnotationView.as_view(), name='add_annotation'),
    path('api/annotations/delete/', api.delete_annotation, name='delete_annotation'),
    re_path(r'api/annotations/get/(?P<record>.+)/', api.AnnotationsView.as_view(), name='annotations')
]
