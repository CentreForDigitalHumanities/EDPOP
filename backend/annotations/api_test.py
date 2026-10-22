from urllib.parse import quote_plus

from rdflib import RDF, URIRef, Literal
from triplestore.constants import EDPOPCOL, OA

from .api import JSON_LD_CONTEXT

SOURCE = 'http://example.com/source'
TARGET = {'oa:hasSource': {'@id': SOURCE}}
DELETION_MARK = {'@id': 'edpopcol:incorrectFieldValue'}


def annotation_exists_for_source(triplestore, source):
    return len(list(triplestore.triples((None, OA.hasSource, URIRef(source))))) == 1


def post_annotation(client, target, body, user, project, motivation=None) -> str:
    """Send a POST request through the API and return the response."""
    data = {
        "@context": JSON_LD_CONTEXT,
        "oa:hasTarget": target,
        "oa:hasBody": body,
        "as:context": {'@id': project.uri},
    }
    if motivation:
        data['oa:motivatedBy'] = motivation
    client.force_login(user)
    return client.post('/api/annotation/', data, content_type='application/ld+json')


def create_annotation(client, target, body, user, project, motivation=None) -> str:
    """Create an annotation through the API and return the URI."""
    response = post_annotation(client, target, body, user, project, motivation)
    assert response.status_code == 200
    uri = str(list(response.data.subjects(RDF.type, EDPOPCOL.Annotation))[0])
    return uri


def test_create_delete_annotation(client, triplestore, django_test_user, project):
    uri = create_annotation(client, TARGET, 'This is an annotation',
                            django_test_user, project)
    assert annotation_exists_for_source(triplestore, SOURCE)
    client.delete(f'/api/annotation/{quote_plus(uri)}/')
    assert not annotation_exists_for_source(triplestore, SOURCE)


def test_create_deletion_mark(client, triplestore, django_test_user, project):
    uri = create_annotation(
        client, TARGET, DELETION_MARK, django_test_user, project, OA.editing
    )
    assert annotation_exists_for_source(triplestore, SOURCE)


def test_fail_bogus_body(client, triplestore, django_test_user, project):
    bogus = {'@id': 'http://example.com/bogus'}
    response = post_annotation(
        client, TARGET, bogus, django_test_user, project, OA.editing
    )
    assert response.status_code == 400


def test_edit_annotation(client, triplestore, django_test_user, project):
    uri = create_annotation(client, TARGET, 'This is an annotation',
                            django_test_user, project)
    client.put(f'/api/annotation/{quote_plus(uri)}/', {
        '@context': JSON_LD_CONTEXT,
        '@id': uri,
        'oa:hasBody': 'This is an edited annotation'
    }, content_type='application/ld+json')
    body_triple = list(triplestore.triples((URIRef(uri), OA.hasBody, None)))[0][0]
    assert body_triple[2] == Literal('This is an edited annotation')


def test_list_annotations(client, triplestore, django_test_user, project):
    uri = create_annotation(client, TARGET, 'This is an annotation',
                            django_test_user, project)
    uri2 = create_annotation(client, TARGET, 'This is another annotation',
                             django_test_user, project)
    endpoint = f'/api/record-annotations/{quote_plus(SOURCE)}/?project={quote_plus(project.uri)}'
    response = client.get(endpoint)
    assert response.status_code == 200
    graph = response.data
    assert len(list(graph.triples((None, OA.hasSource, URIRef(SOURCE))))) == 2
