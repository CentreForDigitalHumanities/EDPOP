from typing import Optional
import pytest
from edpop_explorer import readers, Reader, Record, BibliographicalRecord
from rdflib import URIRef

from .graphs import SearchGraphBuilder, _get_reader_dict, get_reader_by_uriref, get_catalogs_graph, \
    range_available_in_reader


class MockReader(Reader):
    """A special reader for testing purposes that does not access the
    internet to fetch results. Produces 25 records that all have
    their serial number (0 through 24) as their identifier."""
    MAX_ITEMS = 25
    IRI_PREFIX = "http://example.com/reader/"
    CATALOG_URIREF = URIRef("http://example.com/reader")

    def fetch_range(self, range_to_fetch: range) -> range:
        range_to_fetch = range(range_to_fetch.start, min(range_to_fetch.stop, self.MAX_ITEMS))
        for i in range_to_fetch:
            self.records[i] = self.get_by_id(str(i))
        self.number_of_results = self.MAX_ITEMS
        return range_to_fetch

    @classmethod
    def get_by_id(cls, identifier: str) -> Record:
        record = BibliographicalRecord(cls)
        record.identifier = identifier
        return record

    @classmethod
    def transform_query(cls, query: str) -> str:
        return query


class FetchAllMockReader(MockReader):
    FETCH_ALL_AT_ONCE = True


def test_mockreader_start_zero():
    reader = MockReader()
    reader.prepare_query("Hoi")
    reader.fetch(5)
    assert reader.number_fetched == 5
    assert len(reader.records) == 5
    assert reader.records[0].identifier == "0"
    assert not reader.fetching_exhausted
    reader.fetch()
    assert reader.number_fetched == 15
    assert reader.records[10].identifier == "10"
    reader.fetch()
    assert reader.number_fetched == 25
    assert reader.fetching_exhausted


def test_mockreader_range():
    # Skipping first records
    reader2 = MockReader()
    reader2.prepare_query("Hoi")
    reader2.fetch_range(range(5, 10))
    assert reader2.number_fetched == 5
    assert reader2.records[5].identifier == "5"


@pytest.fixture(autouse=True)
def all_default_readers(settings):
    settings.CATALOG_READERS = readers.ALL_READERS


def test_get_reader_dict():
    readers = _get_reader_dict()
    for key in readers:
        value = readers[key]
        assert key == value.CATALOG_URIREF


def test_get_reader_by_uriref():
    uriref = readers.ALL_READERS[0].CATALOG_URIREF
    if uriref is not None:
        assert get_reader_by_uriref(uriref) == readers.ALL_READERS[0]
    else:
        pytest.skip("registered reader has no URIRef")


def test_get_catalogs_graph():
    graph = get_catalogs_graph()
    sample_uriref = readers.ALL_READERS[0].CATALOG_URIREF
    if sample_uriref is None:
        pytest.skip("registered reader has no URIRef")
    else:
        assert (sample_uriref, None, None) in graph


def mock_builder(query, **kwargs):
    builder = SearchGraphBuilder(MockReader)
    _ = builder.query_to_graph(query, **kwargs)
    return builder


def test_builder_first_results():
    builder = mock_builder("hoi", start=0, end=10)
    assert builder.records[0].identifier == "0"
    assert len(builder.records) == 10


def test_buider_later_results():
    builder = mock_builder("hoi", start=5, end=15)
    assert len(builder.records) == 10
    # Builder stores a list of records starting with the first acquired record
    assert builder.records[0].identifier == "5"


def test_builder_more_than_available():
    builder = mock_builder("hoi", start=5, end=50)
    # Assert that only the available records are fetched, which is 
    # 20 because there are 25 records and we started with 5
    assert len(builder.records) == 20
    assert builder.records[0].identifier == "5"


def test_builder_with_caching():
    builder = SearchGraphBuilder(FetchAllMockReader)
    graph = builder.query_to_graph("hoi", end=10)
    # Just make sure that running this again does not cause any errors
    graph2 = builder.query_to_graph("hoi", end=10)
    assert builder.cache_used is True


def test_range_available_in_reader_empty_reader():
    reader = MockReader()
    assert range_available_in_reader(reader, range(0, 10)) is False


def test_range_available_in_reader_exact_range():
    reader = MockReader()
    reader.fetch(10)
    assert range_available_in_reader(reader, range(0, 10)) is True


def test_range_available_in_reader_partially_available():
    reader = MockReader()
    reader.fetch(10)
    assert range_available_in_reader(reader, range(5, 15)) is False


def test_range_available_in_reader_fully_available():
    reader = MockReader()
    reader.fetch(20)
    assert range_available_in_reader(reader, range(5, 15)) is True