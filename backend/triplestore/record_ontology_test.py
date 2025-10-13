from rdflib import RDF, RDFS
from .constants import EDPOPREC
from .record_ontology import import_ontology
from .utils import triple_exists

def test_import_ontology():
    g = import_ontology()
    assert triple_exists(g, (EDPOPREC.Catalog, RDF.type, RDFS.Class))