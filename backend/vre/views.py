from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.contrib.staticfiles import finders

CERL_SRU_URL = "http://sru.cerl.org/thesaurus"
HPB_SRU_URL = "http://sru.gbv.de/hpb"


@login_required
def index(request, id=None):
    with open(finders.find('index.html')) as index_file:
        return HttpResponse(content=index_file)


def mirador(request):
    with open(finders.find('mirador.html')) as mirador_file:
        return HttpResponse(content=mirador_file)
