import datetime
import uuid
from django.conf import settings
from rest_framework.views import Request
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rdflib import URIRef, Graph, Literal, DCTERMS, RDFS, RDF
from rdf.views import RDFView, graph_from_request
from rdf.utils import graph_from_triples
from rdf.renderers import TurtleRenderer, JsonLdRenderer

from accounts.utils import user_to_uriref
from triplestore.constants import EDPOPREC, OA, AS, EDPOPCOL
from triplestore.utils import (
    replace_blank_nodes_in_triples,
    replace_node,
    sparql_multivalues,
    triples_to_quads,
)

ANNOTATION_GRAPH_URI = settings.RDF_NAMESPACE_ROOT + "annotations/"
ANNOTATION_GRAPH_IDENTIFIER = URIRef(ANNOTATION_GRAPH_URI)

RDF_ANNOTATION_ROOT = settings.RDF_NAMESPACE_ROOT + "annotations/"

NS = {
    'rdfs': RDFS,
    'edpoprec': EDPOPREC,
    'edpopcol': EDPOPCOL,
    'oa': OA,
    'as': AS,
    'dcterms': DCTERMS,
}

JSON_LD_CONTEXT = {
    prefix: str(namespace)
    for prefix, namespace in NS.items()
}


record_annotations_query = '''
construct {
  ?a ?pa ?oa .
  ?t ?pt ?ot .
  ?s ?ps ?os .
}
where {
  graph ?annotations {
    ?a ?pa ?oa ;
       oa:hasTarget ?t .
    ?t ?pt ?ot ;
       oa:hasSource ?record .
    optional {
      ?t oa:hasSelector ?s .
      ?s ?ps ?os .
    }
  }
}
'''

delete_annotation_update = '''
delete {
  graph ?annotations {
    ?annotation ?pa ?oa .
    ?target ?pt ?ot .
    ?selector ?ps ?os .
  }
}
where {
  graph ?annotations {
    ?annotation ?pa ?oa .
    optional {
      ?annotation oa:hasTarget ?target .
      ?target ?pt ?ot .
      optional {
        ?target oa:hasSelector ?selector .
        ?selector ?ps ?os .
      }
    }
  }
}
'''

update_annotation_body = '''
delete {
  graph ?annotations {
    ?annotation oa:hasBody ?o .
  }
}
insert {
  graph ?annotations {
    ?annotation oa:hasBody ?body ;
                as:updated ?updated .
  }
}
where {
  graph ?annotations {
    ?annotation oa:hasBody ?o .
  }
}
'''


class AnnotationView(RDFView):
    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = JSON_LD_CONTEXT

    def post(self, request, **kwargs):
        request_graph = graph_from_request(request)

        # Step 1: validate the incoming data.
        bodies = list(request_graph.subject_objects(OA.hasBody))
        targets = list(request_graph.subject_objects(OA.hasTarget))
        sources = list(request_graph.subject_objects(OA.hasSource))
        if len(bodies) == 1:
            s1, body = bodies[0]
        else:
            raise ValidationError('Needs exactly one body')
        if len(targets) == 1:
            s2, target = targets[0]
        else:
            raise ValidationError('Needs exactly one target')
        if len(sources) == 1:
            s3, source = sources[0]
        else:
            raise ValidationError('Needs exactly one source')
        if s1 != s2:
            raise ValidationError('Body and target must be annotation properties')
        if s3 != target:
            raise ValidationError('Source must be a property of the target')
        motivation = request_graph.value(s1, OA.motivatedBy, None, OA.commenting)
        if motivation == OA.commenting:
            if not isinstance(body, Literal):
                raise ValidationError('Comment must be a literal')
        elif motivation == OA.tagging:
            if not isinstance(body, URIRef):
                raise ValidationError('Tag must be a URI')
        else:
            raise ValidationError('Only commenting or tagging is supported at this time')

        # Step 2: normalize the data. We modify the request_graph in place
        # because this is convenient.
        published = Literal(datetime.datetime.now())
        creator = user_to_uriref(request.user)
        request_graph.set((s1, RDF.type, EDPOPCOL.Annotation))
        request_graph.set((s1, AS.published, published))
        request_graph.set((s1, DCTERMS.creator, creator))

        # Step 3: deanonymize all the blank nodes. We give the annotation
        # subject a proper URI, then wrap the remaing ones with the bnode:
        # scheme.
        subject_node = URIRef(RDF_ANNOTATION_ROOT + uuid.uuid4().hex)
        triples_with_subject = replace_node(request_graph, s1, subject_node)
        triples_wo_blank = replace_blank_nodes_in_triples(triples_with_subject)
        clean_triples = list(triples_wo_blank)

        # Finish: store the final clean data and send them back to the client.
        graph = Graph(identifier=ANNOTATION_GRAPH_IDENTIFIER)
        quads = list(triples_to_quads(clean_triples, graph))
        # Get the existing graph from Blazegraph
        store = settings.RDFLIB_STORE
        store.addN(quads)
        store.commit()
        response_graph = graph_from_triples(clean_triples)
        return Response(response_graph)


class AnnotationEditView(RDFView):
    renderer_classes = (JsonLdRenderer, TurtleRenderer)
    json_ld_context = JSON_LD_CONTEXT

    def delete(self, request, **kwargs):
        id_uriref = URIRef(kwargs.get("annotation"))
        store = settings.RDFLIB_STORE
        store.update(delete_annotation_update, initBindings={
            'annotations': ANNOTATION_GRAPH_IDENTIFIER,
            'annotation': id_uriref,
        }, initNs=NS)
        store.commit()
        return Response(Graph())

    def put(self, request, **kwargs):
        # Allow editing of the body. Other properties cannot be edited.
        id_uriref = URIRef(kwargs.get("annotation"))
        graph = graph_from_request(request)
        body = graph.value(id_uriref, OA.hasBody, None)

        updated = Literal(datetime.datetime.now())
        store = settings.RDFLIB_STORE
        # Delete the current body
        store.update(update_annotation_body, initBindings={
            'annotations': ANNOTATION_GRAPH_IDENTIFIER,
            'annotation': id_uriref,
            'body': body,
            'updated': updated,
        }, initNs=NS)
        store.commit()
        graph.set((id_uriref, AS.updated, updated))
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
        query = record_annotations_query
        return graph_from_triples(store.query(query, initBindings={
            'annotations': ANNOTATION_GRAPH_IDENTIFIER,
            'record': record_uri,
        }, initNs=NS))
