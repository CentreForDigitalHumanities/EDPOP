from rdflib import Literal, BNode, Namespace, Graph, URIRef
from triplestore.utils import Quads
from triplestore.rdf_model import RDFModel
from triplestore.rdf_field import (
    RDFPredicateField, RDFPropertyField, RDFUniquePropertyField, RDFQuadField
)
from triplestore.utils import triple_exists
from django.conf import settings

Test = Namespace('https://www.test.org/test#')

class ClubsField(RDFQuadField):
    def get(self, instance):
        return [obj for (_, _, obj, _) in self._stored_quads(instance)]

    def _quads_to_store(self, instance, value) -> Quads:
        return [
            (instance.uri, Test.member, uri, Graph(settings.RDFLIB_STORE, uri))
            for uri in value
        ]

    def _stored_quads(self, instance) -> Quads:
        store = settings.RDFLIB_STORE
        query = f'''
        SELECT ?club {{ GRAPH ?club {{ <{instance.uri}> test:member ?club }} }}
        '''
        results = store.query(query, initNs={'test': Test})
        return [
            (instance.uri, Test.member, result, Graph(settings.RDFLIB_STORE, result))
            for (result,) in results
        ]


class Example(RDFModel):
    named_bob = RDFPredicateField(Test.name, Literal('Bob'))
    lucky_numbers = RDFPropertyField(Test.luckyNumber)
    location = RDFUniquePropertyField(Test.location)
    clubs = ClubsField()

def test_predicate_field(empty_graph):
    g = empty_graph
    instance = Example(g, BNode())

    assert Example.named_bob.get(instance) == False
    
    Example.named_bob.set(instance, True)
    assert triple_exists(g, (instance.uri, Test.name, Literal('Bob')))

    Example.named_bob.clear(instance)
    assert not triple_exists(g, (instance.uri, Test.name, Literal('Bob')))

def test_property_field(empty_graph):
    g = empty_graph
    instance = Example(g, BNode())

    assert Example.lucky_numbers.get(instance) == []

    g.add((instance.uri, Test.luckyNumber, Literal(13)))
    assert Example.lucky_numbers.get(instance) == [13]

    Example.lucky_numbers.set(instance, [7, 15])
    assert triple_exists(g, (instance.uri, Test.luckyNumber, Literal(7)))
    assert triple_exists(g, (instance.uri, Test.luckyNumber, Literal(15)))

    Example.lucky_numbers.clear(instance)
    assert not triple_exists(g, (instance.uri, Test.luckyNumber, None))

def test_unique_property_field(empty_graph):
    g = empty_graph
    instance = Example(g, BNode())

    assert Example.location.get(instance) is None

    x = BNode()
    g.add((instance.uri, Test.location, x))
    assert Example.location.get(instance) == x

    y = BNode()
    Example.location.set(instance, y)
    assert not triple_exists(g, (instance.uri, Test.location, x))
    assert triple_exists(g, (instance.uri, Test.location, y))


def test_quads_field(empty_graph):
    g = empty_graph
    instance = Example(g, URIRef('bob', Test))

    assert Example.clubs.get(instance) == []

    club_1 = URIRef('tennis', Test)
    club_2 = URIRef('chess', Test)
    Example.clubs.set(instance, [club_1, club_2])
    
    club_1_graph = Graph(settings.RDFLIB_STORE, club_1)
    club_2_graph = Graph(settings.RDFLIB_STORE, club_2)
    assert triple_exists(club_1_graph, (instance.uri, Test.member, club_1))
    assert triple_exists(club_2_graph, (instance.uri, Test.member, club_2))

    Example.clubs.clear(instance)
    assert not triple_exists(club_1_graph, (instance.uri, Test.member, club_1))
    assert not triple_exists(club_2_graph, (instance.uri, Test.member, club_2))
