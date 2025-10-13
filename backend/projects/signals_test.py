from rdflib import RDF, Literal
from django.conf import settings

from triplestore.constants import EDPOPCOL, AS
from projects.models import Project


def test_project_graph_created_and_deleted(db):
    triplestore = settings.RDFLIB_STORE

    project = Project.objects.create(name='test')

    triple_pattern = (project.identifier(), RDF.type, EDPOPCOL.Project)
    assert any(triplestore.triples(triple_pattern))

    project.delete()
    assert not any(triplestore.triples(triple_pattern))

def test_project_graph_updated(db):
    triplestore = settings.RDFLIB_STORE
    project = Project.objects.create(
        name='test',
        display_name='Test',
    )
    name_triple = lambda name: (project.identifier(), AS.name, Literal(name))

    assert any(triplestore.triples(name_triple('Test')))

    project.display_name = 'Test 2'
    project.save()

    assert not any(triplestore.triples(name_triple('Test')))
    assert any(triplestore.triples(name_triple('Test 2')))
