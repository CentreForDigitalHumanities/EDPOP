import pytest
from rdflib import URIRef, RDF, RDFS, Literal
from django.conf import settings

from triplestore.constants import AS, EDPOPCOL
from projects.models import Project
from projects.rdf_models import RDFProject
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_graph, collection_uri
from catalogs.triplestore import SCHEMA


@pytest.fixture()
def project(db):
    project = Project.objects.create(name='test', display_name='Test')
    rdf_project = RDFProject(project.graph(), project.identifier())
    return rdf_project


def empty_test_collection(project, name):
    uri = collection_uri(name)
    collection = EDPOPCollection(collection_graph(uri), uri)
    collection.name = name
    collection.project = project.uri
    return collection


@pytest.fixture()
def collection(project):
    return empty_test_collection(project, 'Test collection')


@pytest.fixture()
def records():
    return [
        URIRef('https://example.org/example1'),
        URIRef('https://example.org/example2')
    ]


def test_collection_save_empty(collection):
    collection.save()
    store = settings.RDFLIB_STORE
    assert any(store.triples((collection.uri, RDF.type, EDPOPCOL.Collection)))


def test_collection_save_records(project, collection, records):
    collection.records = records
    collection.save()

    store = settings.RDFLIB_STORE

    for triple, _ in store.triples((None, None, None)):
        print(*triple)

    assert any(store.triples((collection.uri, RDF.type, EDPOPCOL.Collection)))
    assert any(store.triples((collection.uri, AS.context, project.uri)))
    assert any(store.triples((collection.uri, RDFS.member, None)))
    assert any(store.triples((None, SCHEMA.upvoteCount, Literal(1))))

    collection.refresh_from_store()
    assert collection.records == records

    collection.delete()

    assert not any(store.triples((collection.uri, RDF.type, EDPOPCOL.Collection)))
    assert not any(store.triples((collection.uri, AS.context, project.uri)))
    assert not any(store.triples((collection.uri, RDFS.member, None)))
    assert not any(store.triples((None, SCHEMA.upvoteCount, Literal(1))))


def test_collection_add_records(collection, records):
    collection.save()
    store = settings.RDFLIB_STORE

    assert not any(store.triples((collection.uri, RDFS.member, records[0])))
    assert not any(store.triples((collection.uri, RDFS.member, records[1])))
    assert not any(store.triples((records[0], SCHEMA.upvoteCount, None)))
    assert not any(store.triples((records[1], SCHEMA.upvoteCount, None)))

    collection.add_records(records)

    assert any(store.triples((collection.uri, RDFS.member, records[0])))
    assert any(store.triples((collection.uri, RDFS.member, records[1])))
    assert any(store.triples((records[0], SCHEMA.upvoteCount, Literal(1))))
    assert any(store.triples((records[1], SCHEMA.upvoteCount, Literal(1))))


def test_collection_remove_records(collection, records):
    collection.records = records
    collection.save()
    store = settings.RDFLIB_STORE

    assert any(store.triples((collection.uri, RDFS.member, records[0])))
    assert any(store.triples((collection.uri, RDFS.member, records[1])))
    assert any(store.triples((records[0], SCHEMA.upvoteCount, Literal(1))))
    assert any(store.triples((records[1], SCHEMA.upvoteCount, Literal(1))))

    collection.remove_records(records)

    assert not any(store.triples((collection.uri, RDFS.member, records[0])))
    assert not any(store.triples((collection.uri, RDFS.member, records[1])))
    assert not any(store.triples((records[0], SCHEMA.upvoteCount, Literal(1))))
    assert not any(store.triples((records[1], SCHEMA.upvoteCount, Literal(1))))
    assert any(store.triples((records[0], SCHEMA.upvoteCount, Literal(0))))
    assert any(store.triples((records[1], SCHEMA.upvoteCount, Literal(0))))


def test_collection_track_multi_gc(project, collection, records):
    collection2 = empty_test_collection(project, 'Another collection')
    collection3 = empty_test_collection(project, 'Collections galore')
    collection.records = records
    collection.save()
    collection2.save()
    collection3.save()
    collection2.add_records(records[:1])
    collection.remove_records(records[1:])
    collection3.add_records(records)
    collection2.remove_records(records)
    collection3.delete()
    collection2.add_records(records[:1])

    store = settings.RDFLIB_STORE

    refcounts = list(store.triples((None, SCHEMA.upvoteCount, None)))
    assert len(refcounts) == 2
    assert ((records[0], SCHEMA.upvoteCount, Literal(2)), None) in refcounts
    assert ((records[1], SCHEMA.upvoteCount, Literal(0)), None) in refcounts
