from rest_framework import serializers
from rest_framework.reverse import reverse

from .models import Collection, Record, Annotation


class CollectionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Collection
        fields = ('id', 'description', 'context')


class RecordSerializer(serializers.ModelSerializer):
    collection = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Record
        fields = ('id', 'uri', 'collection', 'content')

    def create(self, validated_data):
        created = super().create(validated_data)
        pk = created.pk
        request = self.context['request']
        created.uri = reverse('record-detail', args=[pk], request=request)
        created.save()
        return created


class AnnotationSerializer(serializers.ModelSerializer):
    record = serializers.PrimaryKeyRelatedField(queryset=Record.objects.all())

    class Meta:
        model = Annotation
        fields = ('id', 'record', 'context', 'content')
