import datetime
import json
import time

from django.conf import settings
from django.core.management import BaseCommand
from rdflib import Graph, URIRef, Literal, RDF, DCTERMS

from edpop_explorer.readers import HPBReader
from edpop_explorer import NotFoundError

from accounts.utils import IMPORT_USER_URIREF
from annotations.api import create_annotation_subject_node, ANNOTATION_GRAPH_IDENTIFIER
from catalogs.triplestore import save_to_triplestore, remove_from_triplestore
from catalogs.utils import record_exists
from collect.blank_record import BlankRecordReader, create_blank_record
from collect.rdf_models import EDPOPCollection
from collect.utils import collection_uri, collection_graph, collection_exists
from triplestore.constants import AS, EDPOPCOL, OA
from triplestore.utils import triples_to_quads

RecordMapping = dict[str, str]

glossary_mapping = {
    # There are more entries, but these are the only ones that are in use
    "Chapbook": "https://popular-print-glossary.sites.uu.nl/glossary/chapbook/",
    "Almanac": "https://popular-print-glossary.sites.uu.nl/glossary/almanac/",
    "Abecedarium": "https://popular-print-glossary.sites.uu.nl/glossary/abecedarium/",
    "Catechism primer": "https://popular-print-glossary.sites.uu.nl/glossary/catechism-primer/",
    "Catechism primer ; Rooster primer": "https://popular-print-glossary.sites.uu.nl/glossary/catechism-primer/"
}


def add_records(records: list[str]) -> RecordMapping:
    """Fetch the records using EDPOP Explorer and add them to the triplestore
    (without adding them yet to a collection). Return a mapping between
    the original record URI and the record IRI (as a string) according to
    our new record ontology."""
    record_mapping = {}
    for record_uri in records:
        already_exists = False
        print(f"Fetching record {record_uri}...")
        if "hpb.cerl.org" in record_uri:
            record_id = record_uri.split('/')[-1]
            try:
                reader = HPBReader
                record_iri = reader.identifier_to_iri(record_id)
                if not record_exists(URIRef(record_iri)):
                    record = HPBReader.get_by_id(record_id)
                    time.sleep(2)  # Sleep a few seconds to avoid rate limiting
                    assert record.iri == record_iri
                else:
                    already_exists = True
                    print(f"Record {record_iri} already exists in triplestore; skipping.")
            except NotFoundError:
                print(f"Record {record_uri} not found; ignoring.")
                continue
        elif "edpop.hum.uu.nl" in record_uri:
            record = create_blank_record()
            record_iri = record.iri
        else:
            print(f"Unsupported record {record_uri}; ignoring.")
            continue
        record_mapping[record_uri] = record_iri
        if not already_exists:
            graph = record.to_graph()
            remove_from_triplestore([record])
            save_to_triplestore(graph, [URIRef(record.iri)])
            print(f"Record {record.iri} added to triplestore.")
    return record_mapping


def create_collection(collection_name: str, project_uri: str) -> URIRef:
    """Create collection in triplestore and return its URI."""
    uri = collection_uri(collection_name)
    graph = collection_graph(uri)
    if collection_exists(uri):
        print(f"Collection {uri} already exists - skipping creation")
        return uri
    print(f"Creating collection {uri}")
    name = (uri, AS.name, Literal(collection_name))
    project = (uri, AS.context, URIRef(project_uri))
    type_ = (uri, RDF.type, EDPOPCOL.Collection)
    quads = ((s, p, o, graph) for s, p, o in [name, project, type_])
    graph.addN(quads)
    return uri


def add_records_to_collection(record_iris: list[str], collection_iri: URIRef) -> None:
    collection_obj = EDPOPCollection(collection_graph(collection_iri), collection_iri)
    record_urirefs = [URIRef(x) for x in record_iris]
    record_counter = collection_obj.add_records(record_urirefs)
    print(f"Added {record_counter} records to collection {collection_iri}.")


def add_collections(collections: dict, project_uri: str, record_mapping: RecordMapping) -> None:
    for collection in collections:
        contents = collections[collection]
        collection_iri = create_collection(collection, project_uri)
        if not contents:
            print(f"Warning: {collection} is empty")
            return
        record_iris = [record_mapping[record_uri] for record_uri in contents if record_uri in record_mapping]
        add_records_to_collection(record_iris, collection_iri)


def add_annotations(annotations: dict, record_mapping: dict):
    for record_uri in annotations:
        try:
            record_iri = record_mapping[record_uri]
        except KeyError:
            print(f"Record {record_uri} not found in record mapping; skipping annotations.")
            continue
        for annotation in annotations[record_uri]:
            # We expect a dict with annotation keys as keys and annotation values as values
            assert isinstance(annotation, dict)
            for key in annotation:
                add_annotation(record_iri, key, annotation[key])


def add_annotation(record_iri: str, annotation_key: str, annotation_value: str):
    if annotation_key == "EDPOP Glossary":
        try:
            body = URIRef(glossary_mapping[annotation_value.strip()])
        except KeyError:
            print(f"Glossary value {annotation_value} not found in mapping; skipping.")
            return
        motivation = OA.tagging
    else:
        # Add as record comment - may be changed to field comment manually
        body = Literal(f"{annotation_key}: {annotation_value}")
        motivation = OA.commenting
    subject_node = create_annotation_subject_node()
    as_published = Literal(datetime.datetime.now())
    dcterms_creator = IMPORT_USER_URIREF
    graph = Graph(identifier=ANNOTATION_GRAPH_IDENTIFIER)
    triples = [
        (subject_node, RDF.type, EDPOPCOL.Annotation),
        (subject_node, OA.hasTarget, URIRef(record_iri)),
        (subject_node, OA.motivatedBy, motivation),
        (subject_node, OA.hasBody, body),
        (subject_node, AS.published, as_published),
        (subject_node, DCTERMS.creator, dcterms_creator),
    ]
    quads = list(triples_to_quads(triples, graph))
    store = settings.RDFLIB_STORE
    store.addN(quads)
    store.commit()
    print(f"Added annotation {annotation_key}={annotation_value} to record {record_iri}")


class Command(BaseCommand):
    help = "Import legacy data from JSON file to triplestore."

    def add_arguments(self, parser):
        parser.add_argument('file', type=str)
        parser.add_argument('project_uri', type=str)

    def handle(self, **options):
        data = json.load(open(options['file']))
        project_uri = options['project_uri']

        records = data['records']
        collections = data['collections']
        annotations = data['annotations']

        record_mapping = add_records(records)
        add_collections(collections, project_uri, record_mapping)
        add_annotations(annotations, record_mapping)
