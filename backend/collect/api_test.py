import json
from operator import attrgetter

from django.test import Client
from rest_framework.status import is_success, is_client_error
from rdflib import URIRef, RDF, Graph, Literal
from django.conf import settings
from urllib.parse import quote
from typing import Dict

from triplestore.constants import EDPOPCOL, AS
from collect.utils import collection_uri
from projects.models import Project
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_graph
from collect.api import CollectionsView


def example_collection_data(project_uri) -> Dict:
    return {
        'name': 'My collection',
        'summary': 'These are my favourite records',
        'project': project_uri,
    }


def post_collection(client, project_uri):
    data = example_collection_data(project_uri)
    data['@context'] = CollectionsView.json_ld_context
    return client.post('/api/collections/', data, content_type='application/ld+json')

def test_create_collection(db, user, project, client: Client):
    client.force_login(user)

    response = post_collection(client, project.uri)
    assert is_success(response.status_code)
    uri = URIRef(response.json()['uri'])

    store = settings.RDFLIB_STORE
    assert any(store.triples((uri, RDF.type, EDPOPCOL.Collection)))


def test_create_fails_if_collection_exists(db, user, project, client: Client):
    client.force_login(user)
    success_response = post_collection(client, project.uri)
    assert is_success(success_response.status_code)
    uri = URIRef(success_response.json()['uri'])

    # try to create a collection at the same location
    fail_response = client.post('/api/collections/', {
        'name': 'My collection',
        'summary': 'I like these too',
        'project': project.uri
    }, content_type='application/ld+json')
    assert is_client_error(fail_response.status_code)

    store = settings.RDFLIB_STORE
    is_stored = lambda triple: any(store.triples(triple))
    assert is_stored((uri, AS.summary, Literal('These are my favourite records')))
    assert not is_stored((uri, AS.summary, Literal('I like these too')))


def test_list_collections(db, user, project, client: Client):
    client.force_login(user)

    response = client.get('/api/collections/')
    assert is_success(response.status_code)
    assert len(response.json()['@graph']) == 0

    response = post_collection(client, project.uri)

    response = client.get('/api/collections/')
    assert is_success(response.status_code)
    response_json = response.json()
    response_json = response_json.get('@graph', [response_json])
    assert len(response_json) == 1
    assert response_json[0]['uri'] == settings.RDF_NAMESPACE_ROOT + 'collections/my_collection'
    assert response_json[0]['name'] == 'My collection'


def collection_detail_url(collection_uri: str) -> str:
    return '/api/collections/{}/'.format(quote(collection_uri, safe=''))


def test_retrieve_collection(db, user, project, client: Client):
    client.force_login(user)
    create_response = post_collection(client, project.uri)


    correct_url = collection_detail_url(create_response.json()['uri'])
    nonexistent_uri = collection_uri('does not exist')

    not_found_response = client.get(collection_detail_url(nonexistent_uri))
    assert not_found_response.status_code == 404

    success_response = client.get(correct_url)
    assert is_success(success_response.status_code)
    assert success_response.json()['name'] == 'My collection'

    client.logout()
    no_permission_response = client.get(correct_url)
    assert no_permission_response.status_code == 403

def test_delete_collection(db, user, project, client: Client):
    client.force_login(user)
    create_response = post_collection(client, project.uri)

    detail_url = collection_detail_url(create_response.json()['uri'])
    delete_response = client.delete(detail_url)
    assert is_success(delete_response.status_code)

    retrieve_response = client.get(detail_url)
    assert retrieve_response.status_code == 404

def test_update_collection(db, user, project, client: Client):
    client.force_login(user)

    create_response = post_collection(client, project.uri)
    detail_url = collection_detail_url(create_response.json()['uri'])

    data = example_collection_data(project.uri)
    data.update({'summary': 'I don\'t like these anymore'})

    update_response = client.put(detail_url, data, content_type='application/json')
    assert is_success(update_response.status_code)
    assert update_response.json()['summary'] == 'I don\'t like these anymore'


def test_project_validation(db, user, client: Client):
    client.force_login(user)

    Project.objects.create(name='secret', display_name='Top secret records')

    response = client.post('/api/collections/', {
        'name': 'new collection',
        'summary': None,
        'project': 'secret',
    }, content_type='application/json')

    assert is_client_error(response.status_code)

def test_collection_records(db, user, project, client: Client, saved_records):
    client.force_login(user)
    create_response = post_collection(client, project.uri)
    collection_uri = URIRef(create_response.data['uri'])

    records_url = '/api/collection-records/' + str(collection_uri) + '/'

    # check response with empty data
    empty_response = client.get(records_url)
    assert is_success(empty_response.status_code)
    g = Graph().parse(empty_response.content, format='json-ld')
    result = g.query(f'''
        ASK {{
            FILTER NOT EXISTS {{ ?s ?p ?o }}
        }}
        ''',
    )
    assert result.askAnswer

    # add some records to the collection
    collection_obj = EDPOPCollection(collection_graph(collection_uri), collection_uri)
    collection_obj.records = saved_records
    collection_obj.save()

    # check response contains records
    response = client.get(records_url)
    assert is_success(response.status_code)
    g = Graph().parse(response.content, format='json-ld')
    result = g.query(f'''
        ASK {{
            <https://example.org/example1> ?p1 ?o1 .
            <https://example.org/example2> ?p2 ?o2 .
        }}
        ''',
    )
    assert result.askAnswer


def test_add_single_record_preexisting(client, user, records, collection):
    client.force_login(user)
    collection_uri = str(collection.uri)
    payload = {
        'records': [str(records[0])],
        'collections': [collection_uri],
    }
    response = client.post('/api/add-selection/',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code is 200
    assert response.json() == {collection_uri: 1}
    collection.refresh_from_store()
    assert collection.records == records[:1]


def test_add_multi_record_multi_collection(client, user, records, collections):
    client.force_login(user)
    record_uris = list(map(str, records))
    collection_urirefs = map(attrgetter('uri'), collections)
    collection_uris = list(map(str, collection_urirefs))
    payload = {
        'records': record_uris,
        'collections': collection_uris
    }
    response = client.post('/api/add-selection/',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code is 200
    assert response.json() == {
        uri: 2
        for uri in collection_uris
    }
    records_set = set(records)
    for collection in collections:
        collection.refresh_from_store()
        assert set(collection.records) == records_set


def test_remove_records(client, user, records, collection):
    client.force_login(user)
    collection_uri = str(collection.uri)
    record_uris = list(map(str, records))
    collection.records = records
    collection.save()
    payload = {
        'records': record_uris,
        'collection': collection_uri,
    }
    response = client.post(
        '/api/remove-selection/',
        data=json.dumps(payload),
        content_type='application/json'
    )
    assert response.status_code is 200
    collection.refresh_from_store()
    assert collection.records == []


def test_remove_single_record(client, user, records, collection):
    client.force_login(user)
    collection_uri = str(collection.uri)
    record_uris = list(map(str, records))
    collection.records = records
    collection.save()
    payload = {
        'records': record_uris[:1],
        'collection': collection_uri,
    }
    response = client.post(
        '/api/remove-selection/',
        data=json.dumps(payload),
        content_type='application/json'
    )
    assert response.status_code is 200
    collection.refresh_from_store()
    assert collection.records == records[1:]
