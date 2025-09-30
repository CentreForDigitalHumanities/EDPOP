import assert from 'assert';
import sinon from 'sinon';

import { Annotation } from './annotation.model';

const deepAnnotation = {
    '@id': 'http://example.com/anno',
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
    motivation: deepAnnotation['oa:motivatedBy']['@id'],
    'oa:hasBody': deepAnnotation['oa:hasBody'],
    'oa:hasSource': deepAnnotation['oa:hasTarget']['oa:hasSource']['@id'],
    'edpopcol:field': deepAnnotation['oa:hasTarget']['oa:hasSelector']['edpopcol:field']['@id'],
    'edpopcol:originalText': deepAnnotation['oa:hasTarget']['oa:hasSelector']['edpopcol:originalText'],
};

const serverMod = {
    '@id': 'http://example.com/anno2',
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
});
