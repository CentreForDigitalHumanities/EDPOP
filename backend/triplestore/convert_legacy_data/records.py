from typing import Tuple, Union, Iterator, Set
from rdflib import Graph, URIRef, BNode, RDF, Literal, RDFS
from edpop_explorer.readers import HPBReader
from ..constants import SKOS
from ..utils import ObjectURIs, objects_to_graph

from vre.models import Record, Annotation
from ..constants import EDPOPREC
from ..record_ontology import import_ontology

def content_property_labels_to_graph(objects: Iterator[Union[Record, Annotation]]) -> Tuple[ObjectURIs, Graph]:
    '''
    Collect all the keys for the content of records and annotations
    and convert them to a graph representation.
    '''
    
    property_keys = set(
        key
        for obj in objects
        for key in obj.content
    )
    return _property_labels_to_graph(property_keys)

def _property_labels_to_graph(labels: Set[str]) -> Tuple[ObjectURIs, Graph]:
    '''
    Convert a collection of labels (strings) to graph representation.

    If labels are not recognised from the ontology, a new resource will be created for them.
    Output is a lookup dict (labels to URIs) and a graph defining any new properties.
    '''

    identity = lambda key: key
    ontology = import_ontology()
    convert = lambda label: _property_label_to_graph(label, ontology)
    return objects_to_graph(convert, identity, labels)

def _property_label_to_graph(label: str, ontology: Graph) -> Tuple[URIRef, Graph]:
    '''
    Convert a label for a record property to a graph representation.

    Tries to match the label with the ontology, and creates a new label if no
    match is available.
    '''

    return _existing_property(label, ontology) or _new_property(label)

def _existing_property(label: str, ontology: Graph) -> Union[Tuple[URIRef, Graph], None]:
    '''
    Match a string label to an existing property in the ontology.

    Looks for a resource with `edpoprec:BibligraphicalRecord` or `edpoprec:Record`
    as its domain, and a `skos:prefLabel` that matches the label.

    If this resource exists, returns its URI and an empty graph. If not, returns `None`.
    '''
    
    query = '''
    SELECT ?property ?label
    WHERE {
        { ?property   rdfs:domain edpoprec:BibliographicalRecord }
            UNION { ?property   rdfs:domain edpoprec:Record }
        ?property   skos:prefLabel ?label .
    }
    '''

    result = ontology.query(query, initNs={'rdfs': RDFS, 'edpoprec': EDPOPREC, 'skos': SKOS})

    matches = lambda pref_label: str(pref_label) == label
    match = next(
        (property for property, pref_label in result if matches(pref_label)),
        None
    )
    
    if match:
        # also return a graph to match the return type of similar functions.
        # the property is already in the ontology; we don't need to
        # add new triples to describe it.
        return match, Graph()


def _new_property(label: str) -> Tuple[URIRef, Graph]:
    '''
    Create a new record property based on a string label.

    The property will have edpoprec:Record as its domain and
    edpoprec:Field as its range.
    '''

    g = Graph()
    property = BNode()
    g.add((property, RDF.type, RDF.Property))
    g.add((property, RDFS.domain, EDPOPREC.Record))
    g.add((property, RDFS.range, EDPOPREC.Field))
    g.add((property, SKOS.prefLabel, Literal(label)))

    return property, g

# RECORD CONVERSION

def records_to_graph(records: Iterator[Record], property_uris: ObjectURIs) -> Tuple[ObjectURIs, Graph]:
    '''
    Convert legacy records to graph representation
    '''
    
    catalog_uri, catalog_graph = _legacy_catalog_to_graph()
    
    convert = lambda record: _record_to_graph(record, catalog_uri, property_uris)
    to_id = lambda record: record.id
    record_uris, records_graph =  objects_to_graph(convert, to_id, records)
    g = catalog_graph + records_graph
    return record_uris, g

def _legacy_catalog_to_graph() -> Tuple[URIRef, Graph]:
    '''
    Convert the catalogue for legacy data (HPB) to a graph representation
    '''

    reader = HPBReader()
    graph = reader.catalog_to_graph()
    subject, _, _ = next(graph.triples((None, RDF.type, None)))
    return subject, graph


def _record_to_graph(record: Record, catalog: URIRef, record_properties: ObjectURIs) -> Tuple[URIRef, Graph]:
    '''
    Convert a record to graph representation
    '''

    g = Graph()
    subject = BNode()
    g.add((subject, RDF.type, EDPOPREC.Record))
    g.add((subject, EDPOPREC.fromCatalog, catalog))
    g.add((subject, EDPOPREC.identifier, Literal(record.uri)))
    g.add((subject, EDPOPREC.originalData, Literal(record.content)))

    for (key, value) in record.content.items():
        property = record_properties[key]
        field, field_graph = _field_to_graph(value)
        g += field_graph
        g.add((subject, property, field))

    return subject, g


def _field_to_graph(value: str) -> Tuple[URIRef, Graph]:
    '''
    Convert a field of a record to graph representation
    '''
    
    g = Graph()

    field = BNode()
    g.add((field, RDF.type, EDPOPREC.Field))
    g.add((field, EDPOPREC.originalText, Literal(value)))    

    return field, g
