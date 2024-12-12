import pytest
from rdflib import URIRef, RDF
from django.conf import settings

from triplestore.constants import AS, EDPOPCOL
from projects.models import Project
from projects.rdf_models import RDFProject
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_graph, collection_uri

@pytest.fixture()
def project(db):
    project = Project.objects.create(name='test', display_name='Test')
    rdf_project = RDFProject(project.graph(), project.identifier())
    return rdf_project

def test_collection_model(project):
    uri = collection_uri('Test collection')
    collection = EDPOPCollection(collection_graph(uri), uri)
    collection.name = 'Test collection'
    collection.project = project.uri
    collection.records = [
        URIRef('https://example.org/example1'),
        URIRef('https://example.org/example2')
    ]
    collection.save()

    store = settings.RDFLIB_STORE

    for triple, _ in store.triples((None, None, None)):
        print(*triple)

    assert any(store.triples((collection.uri, RDF.type, EDPOPCOL.Collection)))
    assert any(store.triples((collection.uri, AS.context, project.uri)))
    assert any(store.triples((collection.uri, AS.items, None)))

    collection.refresh_from_store()
    assert collection.records == [
        URIRef('https://example.org/example1'),
        URIRef('https://example.org/example2')
    ]

    collection.delete()

    assert not any(store.triples((collection.uri, RDF.type, EDPOPCOL.Collection)))
    assert not any(store.triples((collection.uri, AS.context, project.uri)))
    assert not any(store.triples((collection.uri, AS.items, None)))
