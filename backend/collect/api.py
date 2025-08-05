from urllib.parse import unquote
from operator import attrgetter

from django.http.request import HttpRequest
from rest_framework import status
from rest_framework.parsers import JSONParser
from rest_framework.viewsets import ModelViewSet, ViewSetMixin
from rest_framework.views import APIView, Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED, HTTP_204_NO_CONTENT
from rest_framework.exceptions import (
    NotFound, NotAuthenticated, ValidationError, ParseError, APIException
)
from rdf.renderers import TurtleRenderer, JsonLdRenderer
from rdf.views import RDFView, RDFResourceView, graph_from_request
from rdf.utils import graph_from_triples
from rdflib import URIRef, RDF, RDFS, Graph, BNode, Literal
from django.conf import settings

from collect.blank_record import create_blank_record
from triplestore.constants import EDPOPCOL, EDPOPREC, AS
from triplestore.utils import sparql_multivalues
from projects.api import user_projects
from catalogs.triplestore import RECORDS_GRAPH_IDENTIFIER, save_to_triplestore
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_exists, collection_graph, collection_uri
from collect.serializers import CollectionSerializer, check_user_project_authorization
from collect.permissions import CollectionPermission

get_uri = attrgetter('uri')

collections_query = '''
construct {{
  ?collection ?property ?value.
}}
where {{
  values ?project {{ {} }}
  graph ?collection {{
    ?collection a edpopcol:Collection ;
                as:context ?project ;
                ?property ?value .
    filter ( ?property != rdfs:member )
  }}
}}
'''.format

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


class CollectionsView(RDFView):
    '''
    List collections and create new ones.
    '''

    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = {
        'rdfs': str(RDFS),
        'as': str(AS),
        'edpopcol': str(EDPOPCOL),
        'uri': '@id',
        'name': 'as:name',
        'summary': 'as:summary',
        'project': {
            '@id': 'as:context',
            '@type': '@id',
        },
        'members': {
            '@id': 'rdfs:member',
            '@type': '@id',
        },
    }

    def get_graph(self, request: Request, **kwargs) -> Graph:
        projects = user_projects(request.user)
        project_uris = map(get_uri, projects)
        project_urirefs = map(URIRef, project_uris)
        query = collections_query(sparql_multivalues(project_urirefs))
        store = settings.RDFLIB_STORE
        return graph_from_triples(store.query(query, initNs={
            'rdfs': RDFS,
            'as': AS,
            'edpopcol': EDPOPCOL,
        }))

    def post(self, request, format=None):
        triples = graph_from_request(request)
        subjects = set(triples.subjects())
        if len(subjects) != 1 or not isinstance(subjects.pop(), BNode):
            raise ValidationError('Pass exactly one blank node subject')
        collection_name = None
        project = None
        props = list(triples.predicate_objects())
        for pred, obj in props:
            if isinstance(pred, BNode) or isinstance(obj, BNode):
                raise ValidationError('Predicates and objects cannot be blank')
            if pred == AS.name:
                collection_name = str(obj)
            elif pred == AS.context:
                project = obj
        if not collection_name:
            raise ValidationError('Please pick an as:name')
        collection = collection_uri(collection_name)
        if collection_exists(collection):
            raise ValidationError(f'Name "{collection_name}" already taken')
        if not project:
            raise ValidationError('Collection must be associated with a project')
        check_user_project_authorization(request.user, project)
        graph = collection_graph(collection)
        quads = ((collection, p, o, graph) for p, o in props)
        graph.addN(quads)
        graph.commit()
        return Response(graph, HTTP_201_CREATED)


class CollectionEditView(RDFResourceView):
    """
    View, update or delete individual collections.
    """

    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = CollectionsView.json_ld_context

    def get_graph(self, request, **kwargs):
        collection_uri = URIRef(unquote(kwargs['collection']))
        return collection_graph(collection_uri)

    def put(self, request, format=None, **kwargs):
        graph = self.get_graph(request, **kwargs)
        uri = graph.identifier
        existing_project = graph.value(subject=uri, predicate=AS.context)
        check_user_project_authorization(request.user, existing_project)
        overrides = graph_from_request(request)
        override_project = overrides.value(subject=uri, predicate=AS.context)
        if override_project and override_project != existing_project:
            check_user_project_authorization(request.user, override_project)
            graph.set((uri, AS.context, override_project))
        override_summary = overrides.value(subject=uri, predicate=AS.summary)
        if override_summary:
            graph.set((uri, AS.summary, override_summary))
        graph.commit()
        return Response(graph)

    def delete(self, request, format=None, **kwargs):
        graph = self.get_graph(request, **kwargs)
        uri = graph.identifier
        existing_project = graph.value(subject=uri, predicate=AS.context)
        check_user_project_authorization(request.user, existing_project)
        store = settings.RDFLIB_STORE
        store.remove_graph(graph)
        store.commit()
        return Response(Graph(), HTTP_204_NO_CONTENT)


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
        collection_uri = URIRef(unquote(collection))

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


class RemoveRecordsViewSet(ViewSetMixin, APIView):
    def create(self, request, pk=None):
        """POST method to *delete* records from a collection."""
        collection = request.data['collection']
        if not collection:
            return Response("No collection selected!", status=status.HTTP_400_BAD_REQUEST)
        records = request.data['records']
        if not records:
            return Response("No records selected!", status=status.HTTP_400_BAD_REQUEST)
        record_uris = list(map(URIRef, records))
        collection_uri = URIRef(collection)
        collection_obj = EDPOPCollection(collection_graph(collection_uri), collection_uri)
        removed_count = collection_obj.remove_records(record_uris)
        return Response({collection: removed_count})


class BlankRecordView(RDFView):
    parser_classes = (JSONParser,)
    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = {
        'rdfs': str(RDFS),
        'edpoprec': str(EDPOPREC),
    }

    def post(self, request, **kwargs):
        return Response(self.get_graph(request))

    def get_graph(self, request, **kwargs) -> Graph:
        try:
            collection = request.data['collection']
        except KeyError:
            raise ParseError("No collection selected!")

        record = create_blank_record()
        record_graph = record.to_graph()
        save_to_triplestore(record_graph, [URIRef(record.iri)])
        collection_uri = URIRef(collection)
        collection_obj = EDPOPCollection(collection_graph(collection_uri), collection_uri)
        record_counter = collection_obj.add_records([record.iri])
        if record_counter != 1:
            raise APIException("Adding blank record failed")

        return record_graph
