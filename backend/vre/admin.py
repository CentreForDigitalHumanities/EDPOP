from django.contrib import admin
from django.contrib.postgres import fields

from django_json_widget.widgets import JSONEditorWidget

from .models import Collection, Record, Annotation



class CollectionAdmin(admin.ModelAdmin):
    pass

class RecordAdmin(admin.ModelAdmin):
    formfield_overrides = {
        fields.JSONField: {'widget': JSONEditorWidget},
    }


class AnnotationAdmin(admin.ModelAdmin):
    pass


admin.site.register(Collection, CollectionAdmin)
admin.site.register(Record, RecordAdmin)
admin.site.register(Annotation, AnnotationAdmin)