'''
Base classes for Django-esque management of RDF data; defines field classes.
'''

from rdflib.term import Identifier, Literal
from rdflib import URIRef, Graph
from typing import Optional
from abc import ABC, abstractmethod

from triplestore import utils

class RDFField(ABC):
    '''
    Abstract class for RDF fields.

    A subclass of RDFField must implement how the field represents values in a graph and
    in the Python object. This can be a single triple or a complex structure.

    In most cases, a subclass should implement the following methods:
    - `__init__`: optional, can be used to set any parameters that apply.
    - `get`: takes model instance as input and returns the modelled value of the field
        based on the graph data.
    - `_stored_triples`: takes a model instance as input and returns the scope of the
        field; that is, a subset of the graph that the field is modelling.
    - `_triples_to_store`: returns a collection of triples that represents the modelled
        value.
    
    An `RDFModel` will use the `get`, `set`, and `clear` endpoints. `set` and `clear` have
    default implementations based on `_stored_triples` and `_triples_to_store`.
    Alternatively, you could implement `set` and `clear` directly; in that case, it's not
    necessary to implement `_stored_triples` and `_triples_to_store`.

    The implementations of the methods listed above should use `self.get_graph()` to
    fetch the correct graph for reading and writing triples. By default, this will be the
    graph of the model instance. To use a constant graph, you can pass a `graph` in the
    initialiser. If the graph is chosen dynamically, you can override the method
    `get_graph`.
    '''

    def __init__(self, graph: Optional[Graph] = None, **kwargs):
        self.graph = graph

    def get_graph(self, instance):
        '''
        Return the graph in which to save data.

        Parameters:
            instance: the RDFModel instance

        By default, this will return the graph passed on on initialisation, if any, or
        the graph of the model instance.

        You can override this method to choose a graph dynamically.
        '''
        return self.graph or instance.graph
    
    @abstractmethod
    def get(self, instance):
        '''
        Returns the value currently stored in the graph.

        Parameters:
            instance: the RDFModel instance

        Returns:
            The modelled value based on the graph. The modelled type is determined by
            the field implementation; it can be anything that suits the model.
        '''

    def set(self, instance, value) -> None:
        '''
        Store a value for the field in a graph

        Parameters:
            instance: the RDFModel instance
            value: the value of the field on the model instance
        '''
        g = self.get_graph(instance)
        utils.replace_triples(
            g,
            self._stored_triples(instance),
            self._triples_to_store(instance, value)
        )

    def clear(self, instance) -> None:
        '''
        Clear the field's data in a graph for a given instance of the model.
        
        This is used as cleanup when deleting the model instance.

        Parameters:
            instance: the RDFModel instance
        '''
        g = self.get_graph(instance)
        for triple in self._stored_triples(instance):
            g.remove(triple)

    def _stored_triples(self, instance) -> utils.Triples:
        '''
        Extract the set of relevant triples from a graph representation

        Parameters:
            instance: the RDFModel instance

        Returns:
            an iterable of RDF triples, based on the graph
        '''
        raise NotImplementedError('Override either this method or set and clear.')

    def _triples_to_store(self, instance, value) -> utils.Triples:
        '''
        Triples that should be stored to represent the modelled value

        Parameters:
            instance: the RDFModel instance
        
        Returns:
            an iterable of RDF triples, based on the modelled value
        '''
        raise NotImplementedError('Override either this method or set and clear.')


class RDFPredicateField(RDFField):
    '''
    Models a property + object in the graph. It checks whether, for a model identified by
    `s`, the triple `(s, p, o)` exists in the graph. This is represented as a boolean.

    For instance, you could write a field like this:
    
    `knows_alice = RDFPredicateField(FOAF.knows, URIRef('https://example.com/alice'))`
    
    Note that unlike the RDFPropertyField (and derivatives), this field does not model all
    triples with the provided property. That is, if `A` is an instance of a model with
    `RDFPredicateField(B, C)`, the value of the field represents whether the triple
    `(A, B, C)` is present in a graph. The presence of another triple `(A, B, D)` is
    considered irrelevant, and will not be affected when you save the field.
    '''

    def __init__(self, property: URIRef, object: Identifier, **kwargs):
        super().__init__(**kwargs)
        self.property = property
        self.object = object

    def get(self, instance):
        return any(self._stored_triples(instance))

    def _stored_triples(self, instance):
        g = self.get_graph(instance)
        subject = instance.uri
        return g.triples((subject, self.property, self.object))
    
    def _triples_to_store(self, instance, value):
        if value:
            subject = instance.uri
            return [(subject, self.property, self.object)]
        else:
            return []

class RDFPropertyField(RDFField):
    '''
    Models a property relationship. For a model instance identified by `s`, this field
    represents all triples `(s, p, o)`, where p is the field's configured property.

    The modelled value is a list of all objects. By default, each object is represented
    as an RDF node, i.e. an `URIRef` or `BNode`, unless it is a `Literal`, in which case
    it will be represented by its value.

    The methods `node_to_value` and `value_to_node` control the representation of each
    object node; you can override these methods to change the way objects are represented.
    '''

    def __init__(self, property: URIRef, **kwargs):
        super().__init__(**kwargs)
        self.property = property

    def get(self, instance):
        return [
            self.node_to_value(o)
            for (s, p, o) in self._stored_triples(instance)
        ]

    def node_to_value(self, node: Identifier):
        '''
        Convert an object node to its modelled value.

        If the node is a Literal, its value will be returned. Otherwise, this will return
        the node itself (as an `URIRef` or `BNode` instance).

        If needed, you can override this method to change the way nodes are represented.

        Parameters:
            node: an object node in the graph
        '''
        if isinstance(node, Literal):
            return node.value
        return node

    def value_to_node(self, value) -> Identifier:
        '''
        Convert a modelled value to an identifier in the graph.

        If the value is already an RDF identifier (an `URIRef`, `BNode`, or `Literal`), it
        will be returned as-is. If not, this will return a `Literal` of the value.

        This behaviour handles the most common cases, but you can override this method
        if needed.

        Parameters:
            value: the modelled value of the object. This matches the output of
                `node_to_value`.
        '''
        if isinstance(value, Identifier):
            return value
        else:
            return Literal(value)

    def _stored_triples(self, instance):
        g = self.get_graph(instance)
        subject = instance.uri
        return g.triples((subject, self.property, None))

    def _triples_to_store(self, instance, value):
        subject = instance.uri
        return [(subject, self.property, self.value_to_node(o)) for o in value]


class RDFUniquePropertyField(RDFPropertyField):
    '''
    Like RDFPropertyField, but when the property is always unique for the subject.

    The modelled value represents the object node, or `None` if no triple is present.
    '''

    def get(self, instance):
        values = super().get(instance)
        if len(values):
            return values[0]


    def set(self, instance, object: Optional[Identifier]):
        return super().set(instance, [object])


class RDFQuadField(RDFField):
    '''
    This variant of an RDFField can be used when the modelled triples may have multiple
    contexts in the store.

    This means the field has to model a set of quads, rather than triples. Particularly
    useful for cross-graph lookups.

    Child classes should implement `_quads_to_store` and `_stored_quads`; these are
    analogous to `_triples_to_store`/`_stored_triples` but return quads instead of
    triples. (`_triples_to_store`/`_stored_triples` need not be implemented.)
    '''

    def set(self, instance, value) -> None:
        '''
        Store a value for the field in a graph

        Parameters:
            g: the graph in which to read and store data
            instance: the model instance
            value: the value of the field on the model instance
        '''
        utils.replace_quads(
            self._stored_quads(instance),
            self._quads_to_store(instance, value)
        )

    def clear(self, instance) -> None:
        '''
        Clear the field's data in a graph for a given instance of the model.
        
        This is used as cleanup when deleting the model instance.

        Parameters:
            instance: the RDFModel instance
        '''
        g = self.get_graph(instance)
        for quad in self._stored_quads(instance):
            s, p, o, g = quad
            g.remove((s, p, o))

    @abstractmethod
    def _stored_quads(self, instance) -> utils.Quads:
        '''
        Extract the set of relevant quads from a graph representation

        Parameters:
            instance: the RDFModel instance
        '''

    @abstractmethod
    def _quads_to_store(self, instance, value) -> utils.Quads:
        '''
        Quads that should be stored to represent the modelled value

        Parameters:
            instance: the RDFModel instance
            value: the field's modelled value on the model instance
        '''

    def _stored_triples(self, instance) -> utils.Triples:
        return []
    
    def _triples_to_store(self, instance, value) -> utils.Triples:
        return []
