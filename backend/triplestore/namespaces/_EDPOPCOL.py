from rdflib.namespace import DefinedNamespace, Namespace
from rdflib.term import URIRef

class EDPOPCOL(DefinedNamespace):
    '''
    EDPOP collection namespace
    
    See https://github.com/UUDigitalHumanitieslab/edpop-collection-ontology/blob/develop/ontology.ttl
    '''

    _NS = Namespace('https://dhstatic.hum.uu.nl/edpop-collection/0.0.0#')

    # classes
    User: URIRef
    Project: URIRef
    Collection: URIRef
    Annotation: URIRef
    Predicate: URIRef
    PredicateSelector: URIRef
    AnnotationBody: URIRef

    # properties
    creator: URIRef
    property: URIRef
    object: URIRef
    suggestsAddition: URIRef
    suggestsRemoval: URIRef
    comment: URIRef
