"""edpop URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.urls import include, path
from django.contrib import admin
from rest_framework import routers
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from vre.api import RecordViewSet, AnnotationViewSet, SearchViewSet
from collect.api import CollectionViewSet, AddRecordsViewSet, RemoveRecordsViewSet

api_router = routers.DefaultRouter()
api_router.register(r'records', RecordViewSet)
api_router.register(r'annotations', AnnotationViewSet)
api_router.register(r'search', SearchViewSet, basename='search')
api_router.register(r'add-selection',
                    AddRecordsViewSet,
                    basename='add-selection')
api_router.register(r'remove-selection',
                    RemoveRecordsViewSet,
                    basename='remove-selection')
api_router.register('collections', CollectionViewSet, basename='collections')

urlpatterns = [
    path('', include('annotations.urls')),
    path('admin/', admin.site.urls),
    path('api-auth/',
         include('rest_framework.urls', namespace='rest_framework')),
    path('api/', include(api_router.urls)),
    path('api/', include('collect.urls')),
    path('', include('catalogs.urls')),
    path('', include('accounts.urls')),
    path('', include('projects.urls')),
    path('', include('vre.urls')),
]

urlpatterns += staticfiles_urlpatterns()
