import requests
import csv
import logging

import sruthi

from bs4 import BeautifulSoup

from django.conf import settings

logger = logging.getLogger(__name__)

HPB_URI = 'http://hpb.cerl.org/record/{}'
VD16_URI = 'http://gateway-bayern.de/{}'  # Spaces should be replaced by +
VD17_URI = 'https://kxp.k10plus.de/DB=1.28/CMD?ACT=SRCHA&IKT=8079&TRM=%27{}%27'
VD18_URI = 'https://kxp.k10plus.de/DB=1.65/SET=1/TTL=1/CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM={}&ADI_MAT=B&MATCFILTER=Y&MATCSET=Y&ADI_MAT=T&REC=*'
READABLE_FIELDS_FILE = settings.BASE_DIR / 'vre' \
    / "M21_readable_fields.csv"

RECORDS_PER_PAGE = 15

# See for information about k10plus APIs:
# https://wiki.k10plus.de/display/K10PLUS/Datenbanken
SRU_INFO = {
    # Information on how to deal with the various SRU APIs.
    # url: the SRU API base URL
    # transformer: how a query should be transformed to specifically select
    #              records from this database. Some databases are combined
    #              with other databases.
    # version: the SRU version (1.1 or 1.2 - 2.0 is not supported by sruthi)
    # uri_function: a function to find the permalink from a record returned
    #               by sruthi
    'hpb': {
        'url': 'http://sru.k10plus.de/hpb',
        'transformer': (lambda x: x),
        'version': '1.1',
        'uri_function': (lambda record: get_hpb_uri(record))
    },
    'vd16': {
        'url': 'http://bvbr.bib-bvb.de:5661/bvb01sru',
        'transformer': (lambda x: 'VD16 and ({})'.format(x)),
        'version': '1.1',
        'uri_function': (
            lambda record:
                VD16_URI.format(
                    get_marc21_subfield(
                        get_marc21_field(record['datafield'], '024'),
                        'a'
                    )
                ).replace(' ', '+')
        )
    },
    'vd17': {
        'url': 'http://sru.k10plus.de/vd17',
        'transformer': (lambda x: x),
        'version': '1.1',
        'uri_function': (
            lambda record:
                VD17_URI.format(
                    get_marc21_subfield(
                        get_marc21_field(record['datafield'], '024'),
                        'a'
                    )
                )
        )
    },
    'vd18': {
        'url': 'http://sru.k10plus.de/vd18',
        'transformer': (lambda x: x),
        'version': '1.1',
        'uri_function': (lambda record: get_vd18_uri(record))
    },
    'gallica': {
        'url': 'https://gallica.bnf.fr/SRU',
        'transformer': (lambda x: 'gallica all ' + x),
        'version': '1.2',
        'uri_function': (lambda record: record['identifier'])
    },
    'cerl-thesaurus': {
        'url': 'https://data.cerl.org/thesaurus/_sru',
        'transformer': (lambda x: x),
        'version': '1.2',
        'uri_function': (lambda record: 'https://data.cerl.org/thesaurus/'
                         + record['id'])
    },
}


def get_marc21_field(datafields: list, field_number: str):
    for field in datafields:
        if field['tag'] == field_number:
            return field


def get_marc21_subfield(field: dict, subfield_code: str):
    if type(field['subfield']) == dict:
        return field['subfield']['text']
    else:
        for subfield in field['subfield']:
            if subfield['code'] == subfield_code:
                return subfield['text']
    return None


def get_hpb_uri(record: dict):
    # The record id for HPB can be found in field 035 in subfield a starting
    # with (CERL), like this: (CERL)HU-SzSEK.01.bibJAT603188.
    # The URI can then be created using HPB_URI.
    # HPB records have field 035 two times.
    for field in record['datafield']:
        if field['tag'] == '035':
            text = get_marc21_subfield(field, 'a')
            if text.startswith('(CERL)'):
                return HPB_URI.format(text[len('(CERL)'):])
    return None


def get_vd18_uri(record: dict):
    # The record id for HPB can be found in field 024 under subfield a,
    # where subfield 2 is 'vd18'
    # VD18 records may have field 024 multiple times
    for field in record['datafield']:
        if field['tag'] == '024' and get_marc21_subfield(field, '2') == 'vd18':
            return VD18_URI.format(get_marc21_subfield(field, 'a')[5:])
    return None


class SRUError(RuntimeError):
    pass


def sru_explain(url_string):
    payload = {'operation': 'explain', 'version': '1.1'}
    response = requests.get(url_string, payload)
    return response


def load_translation_dictionary():
    translationDictionary = {}
    with open(READABLE_FIELDS_FILE) as dictionaryFile:
        reader = csv.DictReader(dictionaryFile)
        for row in reader:
            translationDictionary[row['Tag number']] = row[' Tag description'].strip()
    return translationDictionary


def sru_fetch(database: str, query_string: str, start_record: int) -> dict:
    '''
    Get records from a SRU database using sruthi and the information defined
    by SRU_INFO
    '''
    url_string = SRU_INFO[database]['url']
    transformer = SRU_INFO[database]['transformer']
    query_string_transformed = transformer(query_string)
    uri_function = SRU_INFO[database]['uri_function']

    translation_dictionary = load_translation_dictionary()

    logger.info('Performing SRU query: {}'.format(query_string))
    try:
        records = sruthi.searchretrieve(
            url_string,
            query_string_transformed,
            start_record=start_record,
            maximum_records=RECORDS_PER_PAGE,
            sru_version=SRU_INFO[database]['version']
        )
    except (sruthi.errors.SruError, sruthi.errors.SruthiError) as err:
        raise SRUError(str(err))
    except TypeError as err:
        # This seems to be a bug in sruthi
        logger.exception(err)
        raise SRUError('Error in sruthi library')

    total_results = records.count
    record_list = []
    for record in records[0:RECORDS_PER_PAGE]:
        # By looping through records with for sruthi will try to load more
        # data, so use a slice to limit it.
        print(record)
        uri = uri_function(record)
        datafields = {}
        if 'datafield' in record:
            # Data is in marc21 format
            for field in record['datafield']:
                fieldnumber = field['tag']
                if fieldnumber in translation_dictionary:
                    fieldname = translation_dictionary[fieldnumber]
                    subfields = field['subfield']
                    if type(subfields) != list:
                        # If there is only one subfield, sruthi does not
                        # produce a list - convert it
                        subfields = [subfields]
                    texts = [x['text'] for x in subfields]
                    datafields[fieldname] = ' ; '.join(texts)
        else:
            # Data is not in marc21 format
            datafields = {}
            for field in record:
                datafields[field] = str(record[field])
            if 'title' in datafields:
                datafields['Title'] = datafields['title']
                del datafields['title']
            if 'http://sru.cerl.org/ctas/dtd/1.1:display' in datafields:
                datafields['Title'] = \
                    datafields['http://sru.cerl.org/ctas/dtd/1.1:display']
        result = {
            'content': datafields,
            'uri': uri
        }
        record_list.append(result)

    result_info = {'total_results': total_results, 'result_list': record_list}
    return result_info
