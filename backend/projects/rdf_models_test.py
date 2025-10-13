from rdflib import URIRef, RDF
from django.conf import settings

from triplestore.constants import AS, EDPOPCOL
from projects.models import Project
from projects.rdf_models import RDFProject

def test_project_collections(db):
    store = settings.RDFLIB_STORE
    sql_project = Project.objects.create(name='test', display_name='Test')
    
    g = sql_project.graph()
    uri = sql_project.identifier()

    project = RDFProject(g, uri)

    assert project.collections == []

    collection = URIRef('https://test.org/collections/1')

    g.add((collection, RDF.type, EDPOPCOL.Collection))
    g.add((collection, AS.context, project.uri))
    store.commit()

    project.refresh_from_store()

    assert project.collections == [collection]
