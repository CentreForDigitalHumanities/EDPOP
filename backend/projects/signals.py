from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.conf import settings

from projects.models import Project
from projects.rdf_models import RDFProject

@receiver(pre_save, sender=Project)
def set_project_uri(sender, instance: Project, **kwargs):
    '''
    Set project URI if it is empty.
    '''
    if not instance.uri:
        instance.uri = settings.RDF_NAMESPACE_ROOT + 'projects/' + instance.name

@receiver(post_save, sender=Project)
def store_project_graph(sender, instance: Project, created, **kwargs):
    '''
    Store project metadata in the triplestore.
    '''
    g = instance.graph()
    uri = instance.identifier()

    project = RDFProject(g, uri)
    project.name = instance.display_name
    project.summary = instance.summary
    project.save()

@receiver(post_delete, sender=Project)
def delete_project_graph(sender, instance: Project, **kwargs):
    '''
    Delete all data in a project graph
    '''

    g = instance.graph()
    uri = instance.identifier()

    project = RDFProject(g, uri)
    project.delete()
