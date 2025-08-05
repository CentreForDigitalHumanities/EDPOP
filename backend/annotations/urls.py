from django.urls import path, re_path

from . import api

urlpatterns = [
    path('api/annotations/add/', api.add_annotation, name='add_annotation'),
    re_path(r'api/annotations/get/(?P<record>.+)/', api.AnnotationsView.as_view(), name='annotations')
]
