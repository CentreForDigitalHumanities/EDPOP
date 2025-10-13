from django.urls import path, re_path

from . import api

urlpatterns = [
    re_path(r'api/annotation/(?P<annotation>.+)/', api.AnnotationEditView.as_view(), name='annotation_edit'),
    path('api/annotation/', api.AnnotationView.as_view(), name='annotation'),
    re_path(r'api/record-annotations/(?P<record>.+)/', api.AnnotationsPerTargetView.as_view(), name='record_annotations')
]
