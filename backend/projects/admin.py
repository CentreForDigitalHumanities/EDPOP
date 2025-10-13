from django.contrib import admin
from projects import models

@admin.register(models.Project)
class ProjectAdmin(admin.ModelAdmin):
    fieldsets = [
        (None, {'fields': ['name']}),
        ('Description', {'fields': ['display_name', 'summary']}),
        ('Access', {'fields': ['public', 'users', 'groups']}),
        ('RDF', {'fields': ['identifier']})
    ]

    filter_horizontal = ['users', 'groups']

    def get_readonly_fields(self, request, obj):
        # make name readonly after creation to prevent breaking IRIs
        return ['name', 'identifier'] if obj else ['identifier']
