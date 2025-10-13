from django.urls import path, include
from django.contrib.auth import views

urlpatterns = [
    path('api/accounts/', include('dj_rest_auth.urls')),
    path("accounts/login/", views.LoginView.as_view(template_name="accounts/login.html"), name="login"),
    path("accounts/logout/", views.LogoutView.as_view(), name="logout"),
    path(
        "accounts/password_change/", views.PasswordChangeView.as_view(template_name="accounts/change_password.html"), name="password_change"
    ),
    path(
        "accounts/password_change/done/",
        views.PasswordChangeDoneView.as_view(template_name="accounts/change_password_done.html"),
        name="password_change_done",
    ),
    path("accounts/password_reset/", views.PasswordResetView.as_view(template_name="accounts/password_reset.html"), name="password_reset"),
    path(
        "password_reset/done/",
        views.PasswordResetDoneView.as_view(template_name="accounts/password_reset_done.html"),
        name="password_reset_done",
    ),
    path(
        "accounts/reset/<uidb64>/<token>/",
        views.PasswordResetConfirmView.as_view(template_name="accounts/password_reset_confirm.html"),
        name="password_reset_confirm",
    ),
    path(
        "accounts/reset/done/",
        views.PasswordResetCompleteView.as_view(template_name="accounts/password_reset_complete.html"),
        name="password_reset_complete",
    ),
]
