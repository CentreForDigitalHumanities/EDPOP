from django.contrib.auth.models import User
from dj_rest_auth.serializers import UserDetailsSerializer


class OurUserDetailsSerializer(UserDetailsSerializer):
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'is_staff')
        read_only_fields = ('username', 'email', 'is_staff',)
