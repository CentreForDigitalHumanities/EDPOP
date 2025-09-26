import pytest
from urllib.parse import quote_plus

from rdflib import RDF, URIRef, Literal
from triplestore.constants import EDPOPCOL, OA

from .api import JSON_LD_CONTEXT


@pytest.fixture
def django_test_user(django_user_model):
    return django_user_model.objects.create_user(username='tester', password='secret')


def annotation_exists_for_source(triplestore, source):
    return len(list(triplestore.triples((None, OA.hasSource, URIRef(source))))) == 1


def create_annotation(client, target, body, django_test_user) -> str:
    """Create an annotation through the API and return the URI."""
    data = {
        "@context": JSON_LD_CONTEXT,
        "oa:hasTarget": target,
        "oa:hasBody": body
    }
    client.force_login(django_test_user)
    response = client.post('/api/annotation/', data, content_type='application/ld+json')
    assert response.status_code == 200
    uri = str(list(response.data.subjects(RDF.type, EDPOPCOL.Annotation))[0])
    return uri


def test_create_delete_annotation(client, triplestore, django_test_user):
    source = 'http://example.com/source'
    target = {'oa:hasSource': {'@id': source}}
    uri = create_annotation(client, target, 'This is an annotation', django_test_user)
    assert annotation_exists_for_source(triplestore, source)
    client.delete(f'/api/annotation/{quote_plus(uri)}/')
    assert not annotation_exists_for_source(triplestore, source)


def test_edit_annotation(client, triplestore, django_test_user):
    source = 'http://example.com/source'
    target = {'oa:hasSource': {'@id': source}}
    uri = create_annotation(client, target, 'This is an annotation', django_test_user)
    client.put(f'/api/annotation/{quote_plus(uri)}/', {
        '@context': JSON_LD_CONTEXT,
        '@id': uri,
        'oa:hasBody': 'This is an edited annotation'
    }, content_type='application/ld+json')
    body_triple = list(triplestore.triples((URIRef(uri), OA.hasBody, None)))[0][0]
    assert body_triple[2] == Literal('This is an edited annotation')


def test_list_annotations(client, triplestore, django_test_user):
    source = 'http://example.com/source'
    target = {'oa:hasSource': {'@id': source}}
    uri = create_annotation(client, target, 'This is an annotation', django_test_user)
    uri2 = create_annotation(client, target, 'This is another annotation', django_test_user)
    response = client.get(f'/api/record-annotations/{quote_plus(source)}/')
    assert response.status_code == 200
    graph = response.data
    assert len(list(graph.triples((None, OA.hasSource, URIRef(source))))) == 2
