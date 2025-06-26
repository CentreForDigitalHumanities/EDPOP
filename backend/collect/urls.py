from django.urls import path, re_path

from . import api

urlpatterns = [
    path('collections/', api.CollectionsView.as_view()),
    re_path('collections/(?P<collection>.+)/', api.CollectionEditView.as_view()),
    re_path('collection-records/(?P<collection>.+)/', api.CollectionRecordsView.as_view()),
    path('blank-record/', api.BlankRecordView.as_view()),
]
