from rdflib import Graph, RDF, BNode, Literal, URIRef
from typing import Iterator, Tuple, Callable
from vre.models import ResearchGroup, Collection, Record, Annotation
from ..constants import EDPOPCOL, AS, OA, EDPOPREC
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Model
from itertools import chain

from ..utils import ObjectURIs, objects_to_graph
from .records import records_to_graph as records_content_to_graph, content_property_labels_to_graph
from .annotation_body import annotation_body_to_graph


# APPLICATION

def application_to_graph() -> Tuple[URIRef, Graph]:
    '''
    Add the EDPOP VRE to the graph
    '''
    
    g = Graph()
    subject = BNode()

    g.add((subject, RDF.type, EDPOPCOL.Application))
    _add_application_name_to_graph(g, subject)    

    return subject, g

def _add_application_name_to_graph(g: Graph, subject: URIRef) -> None:
    name = getattr(settings, 'SITE_NAME', None)
    if name:
        g.add((subject, AS.name, Literal(name)))


# USERS

def users_to_graph(users: Iterator[User]) -> Tuple[ObjectURIs, Graph]:
    return models_to_graph(user_to_graph, users)
    

def user_to_graph(user: User) -> Tuple[URIRef, Graph]:
    '''
    Add a user to the graph.

    It is up to users whether they want to make their account name public,
    so this just creates a blank node of the User type.
    '''

    g = Graph()
    subject = BNode()
    g.add((subject, RDF.type, EDPOPCOL.User))
    return subject, g


# PROJECTS

def projects_to_graph(research_groups: Iterator[ResearchGroup]) -> Tuple[ObjectURIs, Graph]:
    '''
    Convert research groups / projects to RDF representation

    The old database has project as a property of research groups, the RDF graph uses "project"
    as the central term because the relationship with user groups is less strict.
    '''

    return models_to_graph(_project_to_graph, research_groups)


def _project_to_graph(research_group: ResearchGroup) -> Tuple[URIRef, Graph]:
    g = Graph()
    subject = BNode()

    g.add((subject, RDF.type, EDPOPCOL.Project))
    _add_project_name_to_graph(research_group, g, subject)

    return subject, g


def _add_project_name_to_graph(research_group: ResearchGroup,
                               g: Graph,
                               subject: URIRef) -> None:
    name = Literal(research_group.project)
    g.add((subject, AS.name, name))


# COLLECTIONS

def collections_to_graph(collections: Iterator[Collection],
                         project_uris: ObjectURIs) -> Tuple[ObjectURIs, Graph]:
    '''
    Convert collections to RDF representation
    '''
    convert = lambda collection: _collection_to_graph(collection, project_uris)
    return models_to_graph(convert, collections)

def _collection_to_graph(collection: Collection,
                        project_uris: ObjectURIs) -> Tuple[URIRef, Graph]:
    g = Graph()
    subject = BNode()
    g.add((subject, RDF.type, EDPOPCOL.Collection))

    _add_collection_description_to_graph(collection, g, subject)
    _add_collection_projects_to_graph(collection, g, subject, project_uris)

    return subject, g


def _add_collection_description_to_graph(collection: Collection,
                                         g: Graph,
                                         subject: URIRef) -> None:
    if collection.description:
        description = Literal(collection.description)
        g.add((subject, AS.summary, description))


def _add_collection_projects_to_graph(collection: Collection,
                                      g: Graph,
                                      subject: URIRef,
                                      project_uris: ObjectURIs) -> None:
    for group in collection.managing_group.all():
        project_uri = project_uris.get(group.id)
        g.add((subject, AS.context, project_uri))


# RECORDS

def records_to_graph(records: Iterator[Record],
                     collection_uris: ObjectURIs,
                     property_uris: ObjectURIs) -> Tuple[ObjectURIs, Graph]:
    '''
    Convert records to RDF representation
    '''

    records_list = list(records)
    record_uris, graph = records_content_to_graph(records_list, property_uris)

    for record in records_list:
        uri = record_uris[record.id]
        graph += _record_uri_to_graph(record, uri)
        graph += _record_collections_to_graph(record, uri, collection_uris)

    return record_uris, graph


def _record_uri_to_graph(record: Record, subject: URIRef) -> Graph:
    g = Graph()
    g.add((subject, EDPOPREC.publicURL, Literal(record.uri)))
    return g


def _record_collections_to_graph(record: Record,
                                     subject: URIRef,
                                     collection_uris: ObjectURIs) -> None:
    g = Graph()
    for collection in record.collection.all():
        collection_uri = collection_uris.get(collection.id)
        g.add((subject, AS.context, collection_uri))
    return g

# ANNOTATIONS

def annotations_to_graph(annotations: Iterator[Annotation],
                        application_uri: URIRef,
                        project_uris: ObjectURIs,
                        record_uris: ObjectURIs,
                        property_uris: ObjectURIs,
                        records_graph: Graph) -> Tuple[ObjectURIs, Graph]:
    '''
    Convert annotations to RDF representation
    '''

    convert = lambda annotation: _annotation_to_graph(annotation,
        application_uri, project_uris, record_uris, property_uris, records_graph)
    return models_to_graph(convert, annotations)


def _annotation_to_graph(annotation: Annotation,
                        application_uri: URIRef,
                        project_uris: ObjectURIs,
                        record_uris: ObjectURIs,
                        property_uris: ObjectURIs,
                        records_graph: Graph) -> Tuple[URIRef, Graph]:
    g = Graph()
    subject = BNode()
    g.add((subject, RDF.type, EDPOPCOL.Annotation))
    g.add((subject, OA.motivatedBy, OA.editing))
    g.add((subject, AS.generator, application_uri))

    _add_annotation_target_to_graph(annotation, g, subject, record_uris)
    _add_annotation_context_to_graph(annotation, g, subject, project_uris)
    g += annotation_body_to_graph(annotation, subject, record_uris, property_uris, records_graph)

    return subject, g


def _add_annotation_target_to_graph(annotation: Annotation,
                                    g: Graph,
                                    subject: URIRef,
                                    record_uris: ObjectURIs) -> URIRef:
    record = record_uris[annotation.record.id]
    g.add((subject, OA.hasTarget, record))


def _add_annotation_context_to_graph(annotation: Annotation,
                                     g: Graph,
                                     subject: URIRef,
                                     project_uris: ObjectURIs) -> None:
    project = project_uris[annotation.managing_group.id]
    g.add((subject, AS.context, project))


# UTILITY

def model_id(model: Model):
    return model.id

def models_to_graph(convert: Callable, objects: Iterator[Model]):
    return objects_to_graph(convert, model_id, objects)

#  CONVERT ALL

def convert_all(users: Iterator[User],
                research_groups: Iterator[ResearchGroup],
                collections: Iterator[Collection],
                records: Iterator[Record],
                annotations: Iterator[Annotation]):
    
    '''
    Combine all conversion functions and create an RDF representation of the database

    Returns:
    - A dict with URI lookups. For each table, gives a dict mapping object IDs to URIs in the graph.
    - The graph representation of the data
    '''

    application_uri, application_graph = application_to_graph()
    user_uris, users_graph = users_to_graph(users)
    project_uris, projects_graph = projects_to_graph(research_groups)
    collection_uris, collections_graph = collections_to_graph(collections, project_uris)
    property_uris, properties_graph = content_property_labels_to_graph(chain(records, annotations))
    record_uris, records_graph = records_to_graph(records, collection_uris, property_uris)
    annotation_uris, annotations_graph = annotations_to_graph(annotations, application_uri, project_uris, record_uris, property_uris, records_graph)

    graph = application_graph + users_graph + projects_graph + collections_graph + properties_graph + records_graph + annotations_graph

    uriref = {
        'users': user_uris,
        'projects': project_uris,
        'collections': collection_uris,
        'records': record_uris,
        'annotations': annotation_uris
    }

    return uriref, graph
