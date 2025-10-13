from rdflib import URIRef, Graph, BNode, RDF
from typing import Tuple, Dict, Set

from vre.models import Annotation
from triplestore.constants import OA, EDPOPCOL
from triplestore.utils import ObjectURIs, union_graphs
from .records import _field_to_graph

def annotation_body_to_graph(annotation: Annotation, annotation_uri: URIRef, record_uris: ObjectURIs, property_uris: ObjectURIs, records_graph: Graph) -> Graph:
    record_uri = _record_uri(annotation, record_uris)
    body, g = _blank_body(annotation_uri)
    g += _additions_to_graph(annotation.content, body, property_uris)
    g += _removals_to_graph(annotation.content, annotation.record.content, body, record_uri, property_uris, records_graph)
    return g

def _blank_body(annotation_uri) -> Tuple[URIRef, Graph]:
    g = Graph()

    body = BNode()
    g.add((annotation_uri, OA.hasBody, body))
    g.add((body, RDF.type, EDPOPCOL.AnnotationBody))

    return body, g

def _additions_to_graph(annotation_content: Dict[str, str],
                        body: URIRef,
                        property_uris: ObjectURIs) -> Graph:
    g = Graph()
    for (key, value) in annotation_content.items():
        field, field_graph = _field_to_graph(value)
        property = property_uris[key]
        predicate, predicate_graph = _annotation_item_to_graph(property, field)
        g += field_graph
        g += predicate_graph
        g.add((body, EDPOPCOL.suggestsAddition, predicate))

    return g

def _removals_to_graph(annotation_content: Dict[str, str],
                       record_content: Dict[str, str],
                       body: URIRef,
                       record: URIRef,
                       property_uris: ObjectURIs,
                       records_graph: Graph) -> Graph:

    replaced_labels = _replaced_labels(annotation_content, record_content)
    to_removal_graph = lambda label: _removal_to_graph(label, body, record, property_uris, records_graph)
    removals = map(to_removal_graph, replaced_labels)
    return union_graphs(removals)

def _removal_to_graph(label: str, body: URIRef, record: URIRef, property_uris: ObjectURIs, records_graph: Graph) -> Graph:
    property = property_uris[label]
    field = _get_field_node(record, records_graph, property)
    predicate, predicate_graph = _annotation_item_to_graph(property, field)
    g = predicate_graph
    g.add((body, EDPOPCOL.suggestsRemoval, predicate))
    return g

def _replaced_labels(annotation_content: Dict[str, str], record_content: Dict[str, str]) -> Set[str]:
    annotation_labels = annotation_content.keys()
    record_labels = record_content.keys()
    return set(annotation_labels).intersection(record_labels)

def _annotation_item_to_graph(property: URIRef, field: URIRef) -> Tuple[URIRef, Graph]:
    g = Graph()

    subject = BNode()
    g.add((subject, RDF.type, EDPOPCOL.Predicate))
    g.add((subject, EDPOPCOL.property, property))
    g.add((subject, EDPOPCOL.object, field))

    return subject, g

def _record_uri(annotation: Annotation, record_uris: ObjectURIs):
    return record_uris[annotation.record.id]

def _get_field_node(record: URIRef, g: Graph, property: URIRef):
    # legacy model does not allow multiple values, so we can assume all properties
    # are functional properties
    return g.value(record, property)