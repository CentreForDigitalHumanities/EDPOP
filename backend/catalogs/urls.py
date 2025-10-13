from django.urls import path

from . import api

urlpatterns = [
    path('api/catalogs/search/', api.SearchView.as_view()),
    path('api/catalogs/catalogs/', api.CatalogsView.as_view()),
    path('readers/<slug:reader>/<slug:record>', api.RecordView.as_view(), name='record'),
]
