from django.db import models
from django.contrib.auth.models import User, Group
from rdflib import URIRef, Graph
from django.conf import settings


class Project(models.Model):
    '''
    A project is a shared endeavour between a group of users (or a single user).

    Projects correspond to an RDF graph that contains related collections, annotations,
    etc. They represent a scope on which access can be managed.
    '''

    name = models.SlugField(
        max_length=64,
        unique=True,
        help_text='Identifier of the project; used in IRIs for the project\'s RDF data',
    )
    display_name = models.CharField(
        max_length=256,
        help_text='Human-friendly name for the project',
    )
    summary = models.TextField(
        blank=True,
        help_text='Summary of the project',
    )
    public = models.BooleanField(
        default=False,
        help_text='If true, any visitors can read the RDF data in this project',
    )
    users = models.ManyToManyField(
        to=User,
        related_name='projects',
        help_text='Users who can write RDF data in this project',
    )
    groups = models.ManyToManyField(
        to=Group,
        related_name='projects',
        help_text='User groups with write access to this project; all their members will '
            'gain access.',
    )


    def __str__(self) -> str:
        return self.name


    def graph(self) -> Graph:
        '''
        RDF graph for the project.
        '''
        store = settings.RDFLIB_STORE
        return Graph(store=store, identifier=self._graph_identifier())


    def _graph_identifier(self) -> URIRef:
        '''
        Identifier for the graph of this project.
        '''
        return URIRef(settings.RDF_NAMESPACE_ROOT + 'project/' + self.name + '/')


    def identifier(self) -> URIRef:
        '''
        Identifier for the subject node of this project.

        This is a node within the project graph; it can be used to give context to the
        project.
        '''
        return URIRef(self.name, base=self._graph_identifier())


    def permit_query_by(self, user: User) -> bool:
        '''
        Whether a user should be permitted to make (read-only) queries on the project
        graph.
        '''
        return self.public or user.is_superuser or self._granted_access(user)


    def permit_update_by(self, user: User) -> bool:
        '''
        Whether a user should be permitted to make update queries on the project graph.
        '''
        return user.is_superuser or self._granted_access(user)


    def _granted_access(self, user: User) -> bool:
        '''
        Whether a user has been given explicit access, either directly or through a group.
        '''
        return self.users.contains(user) or self.groups.filter(user=user).exists()
