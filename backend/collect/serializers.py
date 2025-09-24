from rest_framework import serializers
from rdflib import URIRef

from collect.rdf_models import EDPOPCollection
from collect.utils import collection_uri, collection_exists, collection_graph
from projects.models import Project


class ProjectField(serializers.Field):
    def __init__(self, **kwargs):
        super().__init__( **kwargs)

    def to_internal_value(self, data):
        project = Project.objects.get(name=data)
        return URIRef(project.uri)

    def to_representation(self, value):
        project = Project.objects.get(uri=str(value))
        return project.name


def check_user_project_authorization(user, project_uri):
    project_obj = Project.objects.get(uri=str(project_uri))
    if not project_obj.permit_update_by(user):
        raise serializers.ValidationError(
            'No permission to write to this project'
        )


def can_update_project(data):
    '''
    Validates that the specified project is one the user is allowed to write to.

    Note: not to be confused with CollectionPermission. That permission checks whether the
    user has access to a collection its current context; this validator checks the
    user-submitted data. This prevents users from adding collections to projects they
    cannot access.
    '''

    project_uri = data['project']
    user = data['user']
    check_user_project_authorization(project_uri, user)


class CollectionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128)
    summary = serializers.CharField(
        max_length=1024, required=False, allow_null=True, default=None
    )
    project = ProjectField()
    uri = serializers.URLField(read_only=True)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        validators = [can_update_project]

    def create(self, validated_data):
        project_uri = validated_data['project']
        uri = collection_uri(validated_data['name'])
        graph = collection_graph(uri)

        if collection_exists(uri):
            raise serializers.ValidationError(f'Collection {uri} already exists')

        collection = EDPOPCollection(graph, uri)
        collection.name = validated_data['name']
        collection.summary = validated_data['summary']
        collection.project = project_uri
        collection.save()
        return collection

    def update(self, instance: EDPOPCollection, validated_data):
        instance.name = validated_data['name']
        instance.summary = validated_data['summary']
        instance.project = validated_data['project']
        instance.save()
        return instance
