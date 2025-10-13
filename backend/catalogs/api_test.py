import pytest
from rdflib import Graph

from .graphs import refresh_readers
from .graphs_test import MockReader


@pytest.fixture
def mockreader_installed(settings):
    # Temporarily set MockReader as the only installed reader
    readers = settings.CATALOG_READERS
    settings.CATALOG_READERS = [MockReader]
    refresh_readers()
    yield
    settings.CATALOG_READERS = readers
    refresh_readers()


def test_search_view_happy_path(client, mockreader_installed):
    # Assert that view works correctly in normal situations. Special
    # situations are mostly tested in the tests for SearchGraphBuilder.
    response = client.get("/api/catalogs/search/?source=http://example.com/reader&query=test")
    assert response.status_code == 200
    # Assert that a valid graph is returned
    _ = Graph().parse(response.content, format="json-ld")



def test_search_view_nonexisting_reader(client):
    response = client.get("/api/catalogs/search/?source=http://example.com&query=test")
    assert response.status_code == 400
    assert "application/ld+json" in response.headers['Content-Type']


def test_catalogs_view(client, mockreader_installed):
    response = client.get("/api/catalogs/catalogs/")
    assert response.status_code == 200
    assert "application/ld+json" in response.headers['Content-Type']


