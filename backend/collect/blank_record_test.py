from edpop_explorer import Record
from rdflib import Graph

from .blank_record import create_blank_record, BlankRecordReader


def test_record_is_created_valid_rdf():
    record = create_blank_record()
    assert isinstance(record, Record)
    assert isinstance(record.iri, str)
    assert isinstance(record.to_graph(), Graph)
