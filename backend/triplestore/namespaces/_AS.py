from rdflib.namespace import DefinedNamespace, Namespace
from rdflib.term import URIRef

class AS(DefinedNamespace):
    '''
    Activity streams vocubulary
    
    See https://www.w3.org/ns/activitystreams
    '''

    _NS = Namespace('https://www.w3.org/ns/activitystreams#')

    # objects

    Activity: URIRef
    Application: URIRef
    Article: URIRef
    Audio: URIRef
    Collection: URIRef
    CollectionPage: URIRef
    Relationship: URIRef
    Document: URIRef
    Event: URIRef
    Group: URIRef
    Image: URIRef
    IntransitiveActivity: URIRef
    Note: URIRef
    Object: URIRef
    OrderedCollection: URIRef
    OrderedCollectionPage: URIRef
    Organization: URIRef
    Page: URIRef
    Person: URIRef
    Place: URIRef
    Profile: URIRef
    Question: URIRef
    Service: URIRef
    Tombstone: URIRef
    Video: URIRef

    # activities

    Accept: URIRef
    Add: URIRef
    Announce: URIRef
    Arrive: URIRef
    Block: URIRef
    Create: URIRef
    Delete: URIRef
    Dislike: URIRef
    Follow: URIRef
    Flag: URIRef
    Ignore: URIRef
    Invite: URIRef
    Join: URIRef
    Leave: URIRef
    Like: URIRef
    Listen: URIRef
    Move: URIRef
    Offer: URIRef
    Read: URIRef
    Reject: URIRef
    TentativeAccept: URIRef
    TentativeReject: URIRef
    Travel: URIRef
    Undo: URIRef
    Update: URIRef
    View: URIRef

    # Links and Relationships

    Link: URIRef
    Mention: URIRef
    IsFollowing: URIRef
    IsFollowedBy: URIRef
    IsContact: URIRef
    IsMember: URIRef

    # properties

    subject: URIRef
    relationship: URIRef
    actor: URIRef
    attributedTo: URIRef
    attachment: URIRef
    attachments: URIRef
    author: URIRef
    bcc: URIRef
    bto: URIRef
    cc: URIRef
    context: URIRef
    current: URIRef
    first: URIRef
    generator: URIRef
    icon: URIRef
    image: URIRef
    inReplyTo: URIRef
    items: URIRef
    instrument: URIRef
    orderedItems: URIRef
    last: URIRef
    location: URIRef
    next: URIRef
    object: URIRef
    oneOf: URIRef
    anyOf: URIRef
    closed: URIRef
    origin: URIRef
    accuracy: URIRef
    prev: URIRef
    preview: URIRef
    provider: URIRef
    replies: URIRef
    result: URIRef
    audience: URIRef
    partOf: URIRef
    tag: URIRef
    target: URIRef
    to: URIRef
    url: URIRef
    altitude: URIRef
    content: URIRef
    contentMap: URIRef
    name: URIRef
    nameMap: URIRef
    downstreamDuplicates: URIRef
    duration: URIRef
    endTime: URIRef
    height: URIRef
    href: URIRef
    hreflang: URIRef
    latitude: URIRef
    longitude: URIRef
    mediaType: URIRef
    published: URIRef
    radius: URIRef
    rating: URIRef
    rel: URIRef
    startIndex: URIRef
    startTime: URIRef
    summary: URIRef
    summaryMap: URIRef
    totalItems: URIRef
    units: URIRef
    updated: URIRef
    upstreamDuplicates: URIRef
    verb: URIRef
    width: URIRef
    describes: URIRef
    formerType: URIRef
    deleted: URIRef
