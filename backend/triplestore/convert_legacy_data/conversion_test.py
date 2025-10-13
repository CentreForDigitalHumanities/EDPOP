from rdflib import RDF, Literal, BNode

from ..constants import EDPOPCOL, AS
from ..utils import find_subject_by_class, triple_exists
from .conversion import _collection_to_graph, \
    _annotation_to_graph, records_to_graph, collections_to_graph, application_to_graph, \
    users_to_graph, convert_all



def test_add_collection_to_graph(fake_project, fake_collection):
    collection_node, g = _collection_to_graph(fake_collection)
    
    assert triple_exists(g, (None, RDF.type, EDPOPCOL.Collection))

    summary_triple = (collection_node, AS.summary, Literal('a collection for testing'))
    assert triple_exists(g, summary_triple)

    project_node = fake_project.identifier()
    context_triple = (collection_node, AS.context, project_node)
    assert triple_exists(g, context_triple)


def test_add_annotation_to_graph(fake_collection, fake_record, fake_annotation, property_uris):

    application_uri, _ = application_to_graph()
    collection_uris, _ = collections_to_graph([fake_collection])
    record_uris, record_graph = records_to_graph([fake_record], collection_uris, property_uris)
    annotation, g = _annotation_to_graph(fake_annotation, application_uri, record_uris, property_uris, record_graph)

    assert find_subject_by_class(g, EDPOPCOL.Annotation)

    assert triple_exists(g, (annotation, AS.context, None))
    assert triple_exists(g, (annotation, AS.generator, application_uri))


def test_users_to_graph(fake_user):
    uris, g = users_to_graph([fake_user])

    user_node = uris[fake_user.id]
    assert triple_exists(g, (user_node, RDF.type, EDPOPCOL.User))


def test_convert_all(fake_user, fake_collection, fake_record, fake_annotation):
    refs, graph = convert_all(
        [fake_user],
        [fake_collection],
        [fake_record],
        [fake_annotation]
    )
    assert graph

