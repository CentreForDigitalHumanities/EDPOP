import pytest

from django.contrib.auth.models import User
from rdflib import URIRef

from projects.models import Project
from projects.rdf_models import RDFProject
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_graph, collection_uri


@pytest.fixture()
def user(db) -> User:
    return User.objects.create(
        username='tester',
        password='secret'
    )

@pytest.fixture()
def project(db, user):
    project = Project.objects.create(
        name='test_project',
        display_name='Test project'
    )
    project.users.add(user)
    return project


@pytest.fixture()
def rdf_project(project):
    return RDFProject(project.graph(), project.identifier())


def empty_test_collection(rdf_project, name):
    uri = collection_uri(name)
    collection = EDPOPCollection(collection_graph(uri), uri)
    collection.name = name
    collection.project = rdf_project.uri
    return collection


@pytest.fixture()
def collection(rdf_project):
    return empty_test_collection(rdf_project, 'Test collection')


@pytest.fixture()
def collections(rdf_project):
    return [
        empty_test_collection(rdf_project, 'Another collection'),
        empty_test_collection(rdf_project, 'Collections galore'),
    ]


@pytest.fixture()
def records():
    return [
        URIRef('https://example.org/example1'),
        URIRef('https://example.org/example2')
    ]
