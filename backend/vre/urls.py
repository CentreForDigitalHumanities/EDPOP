from django.urls import re_path, path

from . import views

urlpatterns = [
    path("mirador", views.mirador, name="mirador"),
    re_path(r".*", views.index, name='index'),
]

