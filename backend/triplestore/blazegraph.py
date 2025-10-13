"""Common functionality directly related to Blazegraph."""
import requests
from lxml import etree
from enum import Enum

from django.conf import settings


def verify_blazegraph_connection() -> bool:
    """Return True if connection to Blazegraph triplestore is possible, else
    False."""
    status_url = settings.TRIPLESTORE_BASE_URL + "/status"
    try:
        response = requests.get(status_url)
    except requests.exceptions.ConnectionError:
        return False
    return response.ok


class NamespaceStatus(Enum):
    OK = 0
    ABSENT = 1
    NO_QUADS = 2


def verify_namespace_available() -> NamespaceStatus:
    """Check if the application's namespace exists in BlazeGraph and
    check if it supports quads."""
    namespace = settings.TRIPLESTORE_NAMESPACE
    namespace_info_url = settings.TRIPLESTORE_BASE_URL + "/namespace/" + \
        namespace + "/properties"
    response = requests.get(namespace_info_url)
    if response.status_code == 404:
        return NamespaceStatus.ABSENT
    root = etree.fromstring(response.text.encode())
    quads_element = root.find(
        'entry[@key="com.bigdata.rdf.store.AbstractTripleStore.quads"]')
    if quads_element.text == "true":
        return NamespaceStatus.OK
    else:
        return NamespaceStatus.NO_QUADS
