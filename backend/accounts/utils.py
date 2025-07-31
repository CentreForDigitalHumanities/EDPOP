from django.contrib.auth.models import User
from rdflib import URIRef

from edpop.settings import RDF_NAMESPACE_ROOT

RDF_ACCOUNTS_ROOT = RDF_NAMESPACE_ROOT + "accounts/"


def user_to_uriref(user: User) -> URIRef:
    assert not user.is_anonymous
    return URIRef(RDF_NAMESPACE_ROOT + user.username)
