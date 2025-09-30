import uuid
from django.conf import settings
from django.http.response import HttpResponse
from rest_framework.views import Request
from rest_framework.parsers import JSONParser
from rest_framework.decorators import api_view, renderer_classes
from rest_framework.response import Response
from rdflib import URIRef, Graph, Literal, DCTERMS, RDFS, RDF
import datetime

from triplestore.constants import EDPOPREC, AS, EDPOPCOL
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
    'edpopcol': str(EDPOPCOL),
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


def get_edpoprec_uriref(string: str) -> URIRef:
    partial = string.removeprefix("edpoprec:")
    return EDPOPREC[partial]


def create_field_selectors_triples(data: dict, subject_node: URIRef) -> list:
    triples = []
    select_field = data.get("edpopcol:selectField")
    select_original_text = data.get("edpopcol:selectOriginalText")
    if select_field:
        select_field_uriref = get_edpoprec_uriref(select_field)
        triples.append((subject_node, EDPOPCOL.selectField, select_field_uriref))
    if select_original_text:
        triples.append((subject_node, EDPOPCOL.selectOriginalText, Literal(select_original_text)))
    return triples


def create_annotation_subject_node() -> URIRef:
    return URIRef(RDF_ANNOTATION_ROOT + uuid.uuid4().hex)


class AnnotationView(RDFView):
    parser_classes = (JSONParser,)
    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = JSON_LD_CONTEXT

    def post(self, request, **kwargs):
        subject_node = create_annotation_subject_node()
        graph = Graph(identifier=ANNOTATION_GRAPH_IDENTIFIER)
        if not all(x in request.data.keys() for x in ["oa:hasTarget", "oa:hasBody"]):
            return Response({"error": "Missing required fields"}, status=400)
        oa_has_target = URIRef(request.data.get("oa:hasTarget"))
        oa_motivated_by_value = request.data.get("oa:motivatedBy")
        oa_motivated_by_id = oa_motivated_by_value and oa_motivated_by_value.get("@id")
        oa_has_body_value = request.data.get("oa:hasBody")
        if oa_motivated_by_id in ("oa:commenting", None):
            oa_has_body = Literal(oa_has_body_value)
            oa_motivated_by = OA.commenting
        elif oa_motivated_by_id == "oa:tagging":
            oa_has_body = URIRef(oa_has_body_value)
            oa_motivated_by = OA.tagging
        else:
            return Response({"error": "Invalid oa:motivatedBy value"}, status=400)
        as_published = Literal(datetime.datetime.now())
        dcterms_creator = user_to_uriref(request.user)
        triples = [
            (subject_node, RDF.type, EDPOPCOL.Annotation),
            (subject_node, OA.hasTarget, oa_has_target),
            (subject_node, OA.motivatedBy, oa_motivated_by),
            (subject_node, OA.hasBody, oa_has_body),
            (subject_node, AS.published, as_published),
            (subject_node, DCTERMS.creator, dcterms_creator),
        ]
        triples.extend(create_field_selectors_triples(request.data, subject_node))
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
        # Allow editing of the body. Other properties cannot be edited.
        id_uriref = URIRef(kwargs.get("annotation"))
        oa_has_body = Literal(request.data.get("oa:hasBody"))
        as_updated = Literal(datetime.datetime.now())
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
