import pytest
from vre.models import Record
from rdflib import RDF, BNode
from ..constants import EDPOPREC
from .records import records_to_graph, _record_to_graph, _legacy_catalog_to_graph, _property_labels_to_graph, _property_label_to_graph
from ..utils import triple_exists
from ..record_ontology import import_ontology

@pytest.fixture()
def record_obj(db):
    data = {
        'Title': 'Testing',
        'Author': 'Tester Testington'
    }

    return Record.objects.create(
        uri='http://test.test/test',
        content=data
    )

def test_import_records(record_obj):
    property_uris = {'Title': BNode(), 'Author': BNode()}
    uris, graph = records_to_graph([record_obj], property_uris)
    assert record_obj.id in uris
    uri = uris[record_obj.id]
    assert triple_exists(graph, (uri, RDF.type, EDPOPREC.Record))

def test_import_record(record_obj):
    catalog, _ = _legacy_catalog_to_graph()
    property_uris, _ = _property_labels_to_graph(['Title', 'Author'])
    record, g = _record_to_graph(record_obj, catalog, property_uris)

    assert triple_exists(g, (record, RDF.type, EDPOPREC.Record))

def test_import_properties():
    properties = ['Title', 'Author', 'Title', 'Date']
    uris, _ = _property_labels_to_graph(properties)
    assert all(p in uris for p in properties)

@pytest.fixture(scope='session')
def ontology():
    return import_ontology()

def test_import_property(ontology):
    label = 'Title'
    uri, graph = _property_label_to_graph(label, ontology)
    assert uri == EDPOPREC.title
    assert not triple_exists(graph, (None, None, None))

def import_unknown_property(ontology):
    label = 'Special title'
    uri, graph = _property_label_to_graph(label, ontology)
    assert triple_exists(graph, (uri, RDF.type, RDF.Property))
