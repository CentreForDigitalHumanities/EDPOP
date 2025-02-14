import pytest
from edpop_explorer import Record, EDPOPREC, BibliographicalRecord, Field
from rdflib import Graph, RDF, URIRef

from .graphs_test import MockReader
from .triplestore import save_to_triplestore, remove_from_triplestore


@pytest.fixture
def working_data_records() -> list[Record]:
    reader = MockReader()
    reader.fetch(10)
    record0 = reader.records[0]
    record1 = reader.records[1]
    return [record0, record1]


@pytest.fixture
def working_data_graph(working_data_records) -> tuple[list[Record], Graph]:
    record0, record1 = working_data_records
    """Create some data to work with, as a list of records (needed for
    removal) and as a graph."""
    graph = record0.to_graph() + record1.to_graph()
    return [record0, record1], graph


def stored_records(triplestore):
    """ Retrieve the records currently stored in `triplestore`. """
    return list(triplestore.subjects(RDF.type, EDPOPREC.Record))


def test_add_and_remove(working_data_graph, triplestore):
    records, graph = working_data_graph
    save_to_triplestore(graph)
    assert len(stored_records(triplestore)) == 2
    remove_from_triplestore(records)
    assert len(list(triplestore.triples((None, None, None)))) == 0


def test_add_and_partial_remove(working_data_graph, triplestore):
    records, graph = working_data_graph
    save_to_triplestore(graph)
    remove_from_triplestore([records[0]])  # Only remove first record
    remaining_subjects = stored_records(triplestore)
    assert len(remaining_subjects) == 1
    # Remaining subject should be the IRI of the second record
    assert remaining_subjects[0] == URIRef(records[1].iri)


def test_add_and_partial_remove_with_field(working_data_records, triplestore):
    record0, record1 = working_data_records
    assert isinstance(record0, BibliographicalRecord)
    # Add a field, which results in some additional triples with a blank
    # node subject, which should also be removed.
    record0.title = Field("title")
    graph = record0.to_graph() + record1.to_graph()
    save_to_triplestore(graph)
    remove_from_triplestore([record0])
    remaining_subjects = stored_records(triplestore)
    assert len(remaining_subjects) == 1
    assert remaining_subjects[0] == URIRef(record1.iri)


def test_remove_nonexistent_subject(working_data_graph):
    # Removing subjects that don't exist should not cause any problems
    records, _ = working_data_graph
    remove_from_triplestore(records)
