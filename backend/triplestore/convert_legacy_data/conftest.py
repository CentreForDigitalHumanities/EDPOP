import pytest
from django.contrib.auth.models import User
from rdflib import BNode

from projects.models import Project
from vre.models import Collection, Record, Annotation


# Fixtures with data for conversion - currently just model instances.
# However, this script concerns a data migration so these should eventually
# be changed into standalone objects that mock pre-migration classes, rather than
# current ones.

@pytest.fixture()
def fake_user(db):
    user = User.objects.create()
    return user


@pytest.fixture()
def fake_project(db):
    project = Project.objects.create(
        name='test_project',
        display_name='Test Project'
    )
    return project


@pytest.fixture()
def fake_collection(db, fake_project):
    collection = Collection.objects.create(
        description='a collection for testing',
        context = fake_project,
    )
    return collection


@pytest.fixture()
def fake_record(db, fake_collection):
    record = Record.objects.create(
        uri = 'blablablablabla',
        content = {
            'Title': 'Test'
        }
    )
    record.collection.add(fake_collection)
    record.save()
    return record


@pytest.fixture()
def fake_annotation(db, fake_project, fake_record):
    annotation = Annotation.objects.create(
        record = fake_record,
        context = fake_project,
        content = {
            'Title': 'Different kind of test',
            'Genre': 'Test material',
        }
    )
    return annotation


@pytest.fixture()
def property_uris():
    '''
    Quick stand-in for property URIs in the faked data
    '''
    
    return {
        'Title': BNode(),
        'Author': BNode(),
        'Genre': BNode()
    }