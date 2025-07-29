from django.urls import re_path
from django.urls.conf import path

from . import api

urlpatterns = [
    re_path('collection-records/(?P<collection>.+)/', api.CollectionRecordsView.as_view()),
    path('blank-record/', api.BlankRecordView.as_view()),
]
