from rdflib import BNode, Graph
import pytest

from .annotation_body import annotation_body_to_graph, _replaced_labels
from .records import _record_to_graph
from triplestore.utils import find_subject_by_class
from triplestore.constants import EDPOPCOL, EDPOPREC

@pytest.fixture()
def annotation_body_graph(fake_annotation, property_uris):
    record_uri, record_graph = _record_to_graph(fake_annotation.record, BNode(), property_uris)
    record_uris = { fake_annotation.record.id: record_uri }
    annotation_uri = BNode()

    g = annotation_body_to_graph(fake_annotation, annotation_uri, record_uris, property_uris, record_graph)
    return g + record_graph

def test_annotation_body_to_graph(annotation_body_graph):
    g = annotation_body_graph

    body = find_subject_by_class(g, EDPOPCOL.AnnotationBody)
    additions = list(g.objects(body, EDPOPCOL.suggestsAddition))
    removals = list(g.objects(body, EDPOPCOL.suggestsRemoval))

    assert len(additions) == 2
    assert len(removals) == 1

def test_removal_suggestion_references_field(annotation_body_graph: Graph):
    g = annotation_body_graph

    query = '''
    SELECT ?field
    WHERE {
        ?record     a edpoprec:Record ;
                    ?property ?field .
        ?body       edpopcol:suggestsRemoval ?predicate .
        ?predicate  edpopcol:property ?property ;
                    edpopcol:object ?field .
    }
    '''
    namespaces = { 'edpoprec': EDPOPREC, 'edpopcol': EDPOPCOL }
    results = g.query(query, initNs=namespaces)
    assert len(results) == 1
    

def test_replaced_labels():
    replaced = _replaced_labels(
        {'a': '1', 'b': '2'},
        {'b': '3', 'c': '4'}
    )

    assert replaced == {'b'}