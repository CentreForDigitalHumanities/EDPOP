from rest_framework import status
from rest_framework.viewsets import ModelViewSet, ViewSetMixin
from rest_framework.views import APIView, Request
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rdf.views import RDFView
from rdflib import URIRef, RDF, Graph, BNode, Literal
from django.conf import settings

from projects.api import user_projects
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_exists, collection_graph
from triplestore.constants import EDPOPCOL, AS
from collect.serializers import CollectionSerializer
from collect.permissions import CollectionPermission
from collect.graphs import list_to_graph_collection

class CollectionViewSet(ModelViewSet):
    '''
    Viewset for listing or retrieving collection metadata
    '''

    lookup_value_regex = '.+'
    serializer_class = CollectionSerializer
    permission_classes = [CollectionPermission]

    def get_queryset(self):
        projects = user_projects(self.request.user)
        return [
            EDPOPCollection(collection_graph(uri), uri)
            for project in projects
            for uri in project.rdf_model().collections
        ]


    def get_object(self):
        uri = URIRef(self.kwargs['pk'])

        if not collection_exists(uri):
            raise NotFound(f'Collection does not exist')

        store = settings.RDFLIB_STORE
        context = next(store.contexts((uri, RDF.type, EDPOPCOL.Collection)))
        graph = Graph(store, context)
        collection = EDPOPCollection(graph, uri)
        self.check_object_permissions(self.request, collection)
        return collection


class CollectionRecordsView(RDFView):
    '''
    View the records inside a collection
    '''

    def get_graph(self, request: Request, collection: str, **kwargs) -> Graph:
        collection_uri = URIRef(collection)

        if not collection_exists(collection_uri):
            raise NotFound('Collection does not exist')

        collection_obj = EDPOPCollection(collection_graph(collection_uri), collection_uri)

        g = Graph()
        g.add((collection_obj.uri, RDF.type, EDPOPCOL.Collection))
        g.add((collection_obj.uri, RDF.type, AS.Collection))

        items_node = BNode()
        g.add((collection_obj.uri, AS.items, items_node))
        g.add((collection_obj.uri, AS.totalItems, Literal(len(collection_obj.records))))
        g += list_to_graph_collection(collection_obj.records, items_node)

        return g


class AddRecordsViewSet(ViewSetMixin, APIView):
    def create(self, request, pk=None):
        collections = request.data['collections']
        if not collections:
            return Response("No collection selected!", status=status.HTTP_400_BAD_REQUEST)
        records = request.data['records']
        if not records:
            return Response("No records selected!", status=status.HTTP_400_BAD_REQUEST)
        record_uris = list(map(URIRef, records))
        response_dict = {}
        for collection in collections:
            collection_uri = URIRef(collection)
            collection_obj = EDPOPCollection(collection_graph(collection_uri), collection_uri)
            record_counter = collection_obj.add_records(record_uris)
            response_dict[collection] = record_counter
        return Response(response_dict)
