import uuid
from django.conf import settings
from django.http.response import HttpResponse
from rest_framework.views import Request
from rest_framework.parsers import JSONParser
from rest_framework.decorators import api_view, renderer_classes
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

JSON_LD_CONTEXT = {
    'rdfs': str(RDFS),
    'edpoprec': str(EDPOPREC),
    'oa': str(OA),
    'as': str(AS),
    'dcterms': str(DCTERMS),
}


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

delete_annotation_update = '''
delete {
  graph ?annotations {
    ?annotation ?p ?o.
  }
}
where {
  graph ?annotations {
    ?annotation ?p ?o.
  }
}
'''

delete_annotation_body_update = '''
delete {
  graph ?annotations {
    ?annotation <http://www.w3.org/ns/oa#hasBody> ?o.
  }
}
where {
  graph ?annotations {
    ?annotation <http://www.w3.org/ns/oa#hasBody> ?o.
  }
}
'''

class AnnotationView(RDFView):
    parser_classes = (JSONParser,)
    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = JSON_LD_CONTEXT

    def post(self, request, **kwargs):
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
        graph = graph_from_triples(triples)
        return Response(graph)


class AnnotationEditView(RDFView):
    parser_classes = (JSONParser,)
    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = JSON_LD_CONTEXT

    def delete(self, request, **kwargs):
        id_uriref = URIRef(kwargs.get("annotation"))
        store = settings.RDFLIB_STORE
        store.update(delete_annotation_update, initBindings={
            'annotations': ANNOTATION_GRAPH_IDENTIFIER,
            'annotation': id_uriref,
        })
        store.commit()
        return Response(Graph())

    def put(self, request, **kwargs):
        id_uriref = URIRef(request.data.get("@id"))
        oa_has_body = Literal(request.data.get("oa:hasBody"))
        as_updated = Literal(datetime.date.today())
        store = settings.RDFLIB_STORE
        # Delete the current body
        store.update(delete_annotation_body_update, initBindings={
            'annotations': ANNOTATION_GRAPH_IDENTIFIER,
            'annotation': id_uriref,
        })
        triples = [
            (id_uriref, OA.hasBody, oa_has_body),
            (id_uriref, AS.updated, as_updated),
        ]
        quads = list(triples_to_quads(triples, Graph(identifier=ANNOTATION_GRAPH_IDENTIFIER)))
        store.addN(quads)
        store.commit()
        graph = graph_from_triples(triples)
        return Response(graph)


class AnnotationsPerTargetView(RDFView):
    '''
    View the records inside a collection
    '''

    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = JSON_LD_CONTEXT

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
