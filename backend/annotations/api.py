import uuid
from django.conf import settings
from rest_framework.views import Request
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rdflib import URIRef, Graph, Literal, DCTERMS, RDFS
import datetime

from triplestore.constants import EDPOPREC, AS
from rdf.views import RDFView
from rdf.utils import graph_from_triples
from rdf.renderers import TurtleRenderer, JsonLdRenderer
from accounts.utils import user_to_uriref
from triplestore.constants import OA, AS
from triplestore.utils import triples_to_quads, sparql_multivalues

ANNOTATION_GRAPH_URI = settings.RDF_NAMESPACE_ROOT + "annotations/"
ANNOTATION_GRAPH_IDENTIFIER = URIRef(ANNOTATION_GRAPH_URI)

RDF_ANNOTATION_ROOT = settings.RDF_NAMESPACE_ROOT + "annotations/"


# Argument: target_uris
collection_records_query = '''
construct {{
  ?s ?p ?o .
}}
where {{
  values ?annotation {{ {target_uris} }}
  graph ?annotations {{
    ?s ?p ?o.
    ?s <http://www.w3.org/ns/oa#hasTarget> ?annotation.
  }}
}}
'''.format


@api_view(['POST'])
def add_annotation(request: Request) -> Response:
    subject_node = URIRef(RDF_ANNOTATION_ROOT + uuid.uuid4().hex)
    graph = Graph(identifier=ANNOTATION_GRAPH_IDENTIFIER)
    if not all(x in request.data.keys() for x in ["oa:hasTarget", "oa:hasBody"]):
        return Response({"error": "Missing required fields"}, status=400)
    oa_has_target = URIRef(request.data.get("oa:hasTarget"))
    oa_motivated_by = OA.commenting
    oa_has_body = Literal(request.data.get("oa:hasBody"))
    as_published = Literal(datetime.date.today())
    dcterms_creator = user_to_uriref(request.user)
    triples = [
        (subject_node, OA.hasTarget, oa_has_target),
        (subject_node, OA.motivatedBy, oa_motivated_by),
        (subject_node, OA.hasBody, oa_has_body),
        (subject_node, AS.published, as_published),
        (subject_node, DCTERMS.creator, dcterms_creator),
    ]
    quads = list(triples_to_quads(triples, graph))
    # Get the existing graph from Blazegraph
    store = settings.RDFLIB_STORE
    store.addN(quads)
    store.commit()
    return Response({})


class AnnotationsView(RDFView):
    '''
    View the records inside a collection
    '''

    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = {
        'rdfs': str(RDFS),
        'edpoprec': str(EDPOPREC),
        'oa': str(OA),
        'as': str(AS),
    }

    def get_graph(self, request: Request, record: str, **kwargs) -> Graph:
        record_uri = URIRef(record)
        store = settings.RDFLIB_STORE
        target_uris = sparql_multivalues([record_uri])
        query = collection_records_query(target_uris=target_uris)
        return graph_from_triples(store.query(query, initNs={
            'rdfs': RDFS,
        }, initBindings={
            'annotations': ANNOTATION_GRAPH_IDENTIFIER,
        }))
