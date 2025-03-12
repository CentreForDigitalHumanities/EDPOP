from typing import Iterable
from django.conf import settings
from rdflib import RDFS, IdentifiedNode, RDF

from triplestore.utils import Triples, sparql_multivalues
from triplestore.constants import EDPOPCOL, AS
from triplestore.rdf_model import RDFModel
from triplestore.rdf_field import RDFField, RDFUniquePropertyField
from catalogs.triplestore import RECORDS_GC_GRAPH_URI, SCHEMA


# SPARQL update queries for modifying the contents of a collection. There is
# considerable overlap between the add, remove and clear operations, so we
# extracted the common parts into separate strings.

gc_existing_count = '''
  graph ?gc {{
    ?r schema:upvoteCount ?count .
  }}
'''

gc_adjusted_count = '''
  graph ?gc {{
    ?r schema:upvoteCount ?count_upd .
  }}
'''

collection_member = '''
  graph ?collection {{
    ?collection rdfs:member ?r .
  }}
'''

graphs_values = '''
  values ?collection {{ <{collection}> }}
  values ?gc {{ <{gc_graph}> }}
'''

existing_membership_filter = '''
  graph ?collection {{{{
    filter {} exists {{{{ ?collection rdfs:member ?r }}}}
  }}}}
'''.format

decrementing_count = '''
  graph ?gc {{
    ?r schema:upvoteCount ?count
  }}
  bind (?count - 1 as ?count_upd)
'''

add_records_update = f'''
delete {{{{
  {gc_existing_count}
}}}}
insert {{{{
  {gc_adjusted_count}
  {collection_member}
}}}}
where {{{{
  {graphs_values}
  values ?r {{{{ {{added_records}} }}}}
  {existing_membership_filter('not')}
  graph ?gc {{{{
    optional {{{{ ?r schema:upvoteCount ?c }}}}
  }}}}
  bind (if(bound(?c), ?c, 0) as ?count)
  bind (?count + 1 as ?count_upd)
}}}}
'''.format

remove_records_update = f'''
delete {{{{
  {gc_existing_count}
  {collection_member}
}}}}
insert {{{{
  {gc_adjusted_count}
}}}}
where {{{{
  {graphs_values}
  values ?r {{{{ {{removed_records}} }}}}
  {existing_membership_filter('')}
  {decrementing_count}
}}}}
'''.format

clear_records_update = f'''
delete {{{{
  {gc_existing_count}
  {collection_member}
}}}}
insert {{{{
  {gc_adjusted_count}
}}}}
where {{{{
  {graphs_values}
  {collection_member}
  {decrementing_count}
}}}}
'''.format

# Common parameter to all store.update calls below.
USE_SCHEMA = {'schema': SCHEMA}


class CollectionMembersField(RDFField):
    '''
    Field for the records that are contained in an EDPOP collection.

    This field class extends the common interface with add and remove
    operations. These need to execute only one SPARQL update, while the set
    method needs to execute three.
    '''

    def get(self, instance: RDFModel):
        g = self.get_graph(instance)
        return list(g.objects(instance.uri, RDFS.member))

    def add(self, instance: RDFModel, value: Iterable[IdentifiedNode]) -> None:
        g = self.get_graph(instance)
        store = settings.RDFLIB_STORE
        store.update(add_records_update(
            added_records=sparql_multivalues(value),
            collection=g.identifier,
            gc_graph=RECORDS_GC_GRAPH_URI,
        ), initNs=USE_SCHEMA)
        store.commit()

    def remove(self, instance: RDFModel, value: Iterable[IdentifiedNode]) -> None:
        g = self.get_graph(instance)
        store = settings.RDFLIB_STORE
        store.update(remove_records_update(
            removed_records=sparql_multivalues(value),
            collection=g.identifier,
            gc_graph=RECORDS_GC_GRAPH_URI,
        ), initNs=USE_SCHEMA)
        store.commit()

    def set(self, instance: RDFModel, value: Iterable[IdentifiedNode]) -> None:
        g = self.get_graph(instance)
        store = settings.RDFLIB_STORE
        existing = set(self.get(instance))
        override = set(value)
        added = override - existing
        removed = existing - override
        store.update(remove_records_update(
            removed_records=sparql_multivalues(removed),
            collection=g.identifier,
            gc_graph=RECORDS_GC_GRAPH_URI,
        ), initNs=USE_SCHEMA)
        store.update(add_records_update(
            added_records=sparql_multivalues(added),
            collection=g.identifier,
            gc_graph=RECORDS_GC_GRAPH_URI,
        ), initNs=USE_SCHEMA)
        store.commit()

    def clear(self, instance: RDFModel) -> None:
        g = self.get_graph(instance)
        store = settings.RDFLIB_STORE
        store.update(clear_records_update(
            collection=g.identifier,
            gc_graph=RECORDS_GC_GRAPH_URI,
        ), initNs=USE_SCHEMA)
        store.commit()


class EDPOPCollection(RDFModel):
    '''
    RDF model for EDPOP collections.
    '''
    rdf_class = EDPOPCOL.Collection

    name = RDFUniquePropertyField(AS.name)
    summary = RDFUniquePropertyField(AS.summary)
    project = RDFUniquePropertyField(AS.context)
    records = CollectionMembersField()

    def add_records(self, records):
        self.__class__.records.add(self, records)
        added = set(records) - set(self.records)
        self.records.extend(added)

    def remove_records(self, records):
        self.__class__.records.remove(self, records)
        remaining = set(self.records) - set(records)
        self.records = list(remaining)
