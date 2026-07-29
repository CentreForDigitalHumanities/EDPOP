import assert from 'assert';
import sinon from 'sinon';

import _ from 'lodash';
import { Annotation, Annotations } from './annotation.model';
import { vreChannel } from '../radio.js';

const deepAnnotation = {
    '@id': 'http://example.com/anno',
    'as:context': {'@id': 'http://example.com/project'},
    'oa:motivatedBy': {'@id': 'oa:commenting'},
    'oa:hasBody': 'awesome',
    'oa:hasTarget': {
        'oa:hasSource': {'@id': 'http://example.com/source'},
        'oa:hasSelector': {
            'edpopcol:field': {'@id': 'edpoprec:title'},
            'edpopcol:originalText': 'fabulous',
        },
    },
};

const flatAnnotation = {
    '@id': deepAnnotation['@id'],
    context: deepAnnotation['as:context']['@id'],
    motivation: deepAnnotation['oa:motivatedBy']['@id'],
    'oa:hasBody': deepAnnotation['oa:hasBody'],
    'oa:hasSource': deepAnnotation['oa:hasTarget']['oa:hasSource']['@id'],
    'edpopcol:field': deepAnnotation['oa:hasTarget']['oa:hasSelector']['edpopcol:field']['@id'],
    'edpopcol:originalText': deepAnnotation['oa:hasTarget']['oa:hasSelector']['edpopcol:originalText'],
};

const serverMod = {
    '@id': 'http://example.com/anno2',
    'as:context': deepAnnotation['as:context'],
    'oa:motivatedBy': {'@id': 'oa:tagging'},
    'oa:hasBody': {'@id': 'http://example.com/almanac'},
    'oa:hasTarget': {
        'oa:hasSource': {'@id': 'http://example.com/source'},
        'oa:hasSelector': {
            'edpopcol:field': {'@id': 'edpoprec:notes'},
            'edpopcol:originalText': 'pictures!',
        },
    },
};

const clientMod = {
    '@id': serverMod['@id'],
    context: serverMod['as:context']['@id'],
    motivation: serverMod['oa:motivatedBy']['@id'],
    tagURL: serverMod['oa:hasBody']['@id'],
    'oa:hasSource': serverMod['oa:hasTarget']['oa:hasSource']['@id'],
    'edpopcol:field': serverMod['oa:hasTarget']['oa:hasSelector']['edpopcol:field']['@id'],
    'edpopcol:originalText': serverMod['oa:hasTarget']['oa:hasSelector']['edpopcol:originalText'],
};

describe('Annotation model', () => {
    let model;

    beforeEach(() => {
        model = new Annotation;
    });

    afterEach(() => {
        model.clear().off().stopListening();
    });

    it('parses deep JSON-LD into a convenient flat structure', () => {
        const parsed = model.parse(deepAnnotation);
        sinon.assert.match(parsed, flatAnnotation);
    });

    it('preserves the nested structure when parsing', () => {
        const parsed = model.parse(deepAnnotation);
        sinon.assert.match(parsed, deepAnnotation);
    });

    it('serializes the flat structure back to deep', () => {
        model.set(flatAnnotation);
        const serialized = model.toJSON();
        assert.deepStrictEqual(serialized, deepAnnotation);
    });

    it('updates with server side changes', () => {
        model.set(flatAnnotation);
        // by parsing first, we emulate the behaviour of the sync methods
        model.set(model.parse(serverMod)),
        sinon.assert.match(model.attributes, clientMod);
    });

    it('updates the server with client side changes', () => {
        // we pretend that the attributes were originally set by the server
        model.set(model.parse(deepAnnotation)),
        sinon.assert.match(model.attributes, deepAnnotation);
        sinon.assert.match(model.attributes, flatAnnotation);
        // now, we override on the client side
        model.set(clientMod);
        // finally, toJSON tells us what will be sent to the server
        const serialized = model.toJSON();
        assert.deepStrictEqual(serialized, serverMod);
    });

    it('recognizes field value deletions', () => {
        const modifiedDeep = _.defaults({
            'oa:hasBody': {
                '@id': 'edpopcol:incorrectFieldValue'
            }
        }, deepAnnotation);
        const parsed = model.parse(modifiedDeep);
        assert parsed.marksDeletion === true;
    });

    it('serializes field value deletions', () => {
        model.set(model.parse(deepAnnotation));
        model.set('marksDeletion', true);
        const serialized = model.toJSON();
        assert(!('marksDeletion' in serialized));
        assert.deepStrictEqual(serialized['oa:hasBody'], {
            '@id': 'edpopcol:incorrectFieldValue'
        });
    });
});

describe('Annotations collection', () => {
    const target = 'http://example.com/target',
          project = {id: 'http://example.com/project'};
    let collection;

    beforeEach(() => {
        collection = new Annotations(null, {target});
        vreChannel.reply('projects:current', _.constant(project));
    });

    afterEach(() => {
        vreChannel.stopReplying('projects:current');
        collection.off().stopListening().reset();
    });

    describe('url method', () => {
        it('addresses the record-annotations endpoint', () => {
            assert(collection.url().startsWith('/api/record-annotations/'))
        });

        it('includes the escaped URI of the target record', () => {
            const targetPart = `/${encodeURIComponent(target)}/`;
            assert(collection.url().includes(targetPart));
        });

        it('ends with the current project', () => {
            const projectPart = `/?project=${encodeURIComponent(project.id)}`;
            assert(collection.url().endsWith(projectPart));
        });
    });
});
