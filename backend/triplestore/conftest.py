import pytest
from rdflib import Graph

@pytest.fixture()
def empty_graph():
    return Graph()
