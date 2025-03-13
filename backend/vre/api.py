from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSetMixin
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.renderers import JSONRenderer

from projects.api import user_projects
from .serializers import *
from .models import *
from .sru_query import SRUError, sru_fetch, SRU_INFO

ERROR_MESSAGE_500 = (
    'The server doesn\'t feel too well right now. '
    'If the problem persists, please contact the maintainer.'
)


class ListMineMixin(object):
    """
    Mixin for viewsets that adds a /mine/ list route.

    Suppose that the normal list route on your viewset returns all animals.
    Then the /mine/ list route will return all animals that are in or belong
    to one of the projects of the current user. Like this:

        /api/animals/       => Cat, Dog, Cow, Pig, Chicken
        /api/animals/mine/  => Cat, Pig, Chicken

    In order to use, inherit from this class *before* the ViewSet base class.
    Specify the `queryset` property on the child class. In addition, either
    specify the `context_field` property or override `get_queryset_mine`.

    The `context_field` property may be any field name on your model that
    references a Project. It may also span relationships. For example, if
    each Animal has a Stable and each Stable belongs to a Project, then
    your `context_field` might be `stable__context`. For further
    information on field lookups that span relationships, refer to the Django
    documentation:

    https://docs.djangoproject.com/en/1.11/topics/db/queries/#lookups-that-span-relationships

    As an alternative to the `context_field` property, you may override the
    `get_queryset_mine` method. This method takes no arguments other than
    `self` and should return the reduced queryset, containing only the objects
    that belong to a project of the current user.
    """

    @action(detail=False)
    def mine(self, request):
        # get_queryset takes care of the reduced queryset
        return self.list(request)

    def get_queryset(self):
        if self.action == 'mine':
            return self.get_queryset_mine()
        return self.queryset.all()

    def get_queryset_mine(self):
        projects = self.get_projects()
        project_filter = {self.context_field + '__in': projects}
        return self.queryset.filter(**project_filter)

    def get_projects(self):
        """ Returns the Projects the current user is involved in. """
        return user_projects(self.request.user)

    # We manually enforce application/json for this route, because Safari
    # has a bug that sometimes causes it to send the wrong Accept header.
    def perform_content_negotiation(self, request, force=False):
        if self.action == 'mine':
            renderer = JSONRenderer()
            return renderer, renderer.media_type
        return super().perform_content_negotiation(request, force)


class CreateReadModelViewSet(
        mixins.CreateModelMixin,
        mixins.ListModelMixin,
        mixins.RetrieveModelMixin,
        viewsets.GenericViewSet,
    ):
    """
    A viewset that provides `retrieve`, `create`, and `list` actions.

    Importantly, this class does not provide `update`, `partial_update`
    or `destroy`.
    To use it, override the class and set the `.queryset` and
    `.serializer_class` attributes.

    This class was copied from the example over here:
    http://www.django-rest-framework.org/api-guide/viewsets/#custom-viewset-base-classes
    """
    pass

class CollectionViewSet(ListMineMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CollectionSerializer
    queryset = Collection.objects.all()
    context_field = 'context'
    filter_fields = ['context__id']


class RecordViewSet(CreateReadModelViewSet):
    serializer_class = RecordSerializer
    queryset = Record.objects.all()
    filter_fields = ['uri', 'collection__id']


class AnnotationViewSet(viewsets.ModelViewSet):
    serializer_class = AnnotationSerializer
    queryset = Annotation.objects.all()
    filter_fields = ['record__id', 'record__uri']


class SearchViewSet(ViewSetMixin, APIView):
    def list(self, request, format=None):
        searchterm = request.query_params.get('search')
        if not searchterm:
            return Response("search field empty", status=status.HTTP_400_BAD_REQUEST)
        if 'startRecord' in request.query_params:
            startRecord = request.query_params.get('startRecord')
        else:
            startRecord = 1
        search_source = request.query_params.get('source')
        if search_source in SRU_INFO:
            try:
                result_info = sru_fetch(
                    search_source,
                    searchterm,
                    start_record=startRecord
                )
            except SRUError as err:
                return Response(
                    'Error searching using {} API: {}'
                    .format(search_source, str(err)),
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            # searching records in collection: do they contain the search term anywhere in content?
            records = Record.objects.filter(collection__id=search_source)
            record_ids = records.values_list('id', flat=True)
            search_results = records.filter(content__icontains=searchterm)
            # searching all annotations for the search term, and retrieving associated records
            annotation_results = Annotation.objects.filter(
                record__in=record_ids
            ).filter(
                content__icontains=searchterm
            ).select_related('record') #this saves database lookups
            result_list = [RecordSerializer(result).data for result in search_results]
            for ann in annotation_results:
                new_result = RecordSerializer(ann.record).data
                if not new_result in result_list:
                    result_list.append(new_result)
            result_info = {'total_results': len(result_list), 'result_list': result_list}
        return Response(result_info)
