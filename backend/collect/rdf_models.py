from rdflib import RDFS, IdentifiedNode, RDF
from typing import Iterable

from triplestore.utils import Triples
from triplestore.constants import EDPOPCOL, AS
from triplestore.rdf_model import RDFModel
from triplestore.rdf_field import RDFField, RDFUniquePropertyField


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


class CollectionMembersField(RDFField):
    '''
    Field for the records that are contained in an EDPOP collection.
    '''

    def get(self, instance: RDFModel):
        g = self.get_graph(instance)
        return list(g.objects(instance.uri, RDFS.member))


    def _stored_triples(self, instance: RDFModel) -> Triples:
        g = self.get_graph(instance)
        return list(g.triples((instance.uri, RDFS.member, None)))


    def _triples_to_store(self, instance: RDFModel, value: Iterable[IdentifiedNode]) -> Triples:
        return [(instance.uri, RDFS.member, item) for item in value]


class EDPOPCollection(RDFModel):
    '''
    RDF model for EDPOP collections.
    '''
    rdf_class = EDPOPCOL.Collection

    name = RDFUniquePropertyField(AS.name)
    summary = RDFUniquePropertyField(AS.summary)
    project = RDFUniquePropertyField(AS.context)
    records = CollectionMembersField()
