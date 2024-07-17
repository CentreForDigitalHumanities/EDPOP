from django.urls import re_path

from . import api

urlpatterns = [
    re_path('collection-records/(?P<collection>.+)/', api.CollectionRecordsView.as_view()),
]
