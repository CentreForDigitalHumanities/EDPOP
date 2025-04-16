from rest_framework import status
from rest_framework.viewsets import ModelViewSet, ViewSetMixin
from rest_framework.views import APIView, Request
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rdf.renderers import TurtleRenderer, JsonLdRenderer
from rdf.views import RDFView
from rdf.utils import graph_from_triples
from rdflib import URIRef, RDF, RDFS, Graph, BNode, Literal
from django.conf import settings

from triplestore.constants import EDPOPCOL, EDPOPREC
from projects.api import user_projects
from catalogs.triplestore import RECORDS_GRAPH_IDENTIFIER
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_exists, collection_graph
from collect.serializers import CollectionSerializer
from collect.permissions import CollectionPermission

collection_records_query = '''
construct {
  ?record ?p ?o .
  ?field ?p2 ?o2 .
}
where {
  graph ?collection {
    ?collection rdfs:member ?record .
  }
  graph ?records {
    ?record ?p ?o.
    optional {
      ?record ?f ?field .
      ?field ?p2 ?o2 .
    }
  }
}
'''


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

    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = {
        'rdfs': str(RDFS),
        'edpoprec': str(EDPOPREC),
    }

    def get_graph(self, request: Request, collection: str, **kwargs) -> Graph:
        collection_uri = URIRef(collection)

        if not collection_exists(collection_uri):
            raise NotFound('Collection does not exist')

        store = settings.RDFLIB_STORE
        return graph_from_triples(store.query(collection_records_query, initNs={
            'rdfs': RDFS,
        }, initBindings={
            'collection': collection_uri,
            'records': RECORDS_GRAPH_IDENTIFIER,
        }))


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
