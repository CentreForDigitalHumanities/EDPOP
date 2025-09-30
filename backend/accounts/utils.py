from django.contrib.auth.models import User
from django.conf import settings
from rdflib import URIRef

RDF_ACCOUNTS_ROOT = settings.RDF_NAMESPACE_ROOT + "accounts/"


def user_to_uriref(user: User) -> URIRef:
    assert not user.is_anonymous
    return URIRef(RDF_ACCOUNTS_ROOT + user.username)

IMPORT_USER_URIREF = URIRef(RDF_ACCOUNTS_ROOT + "import")
