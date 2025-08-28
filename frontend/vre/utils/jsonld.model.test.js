import assert from 'assert';
import sinon from 'sinon';
import _ from 'lodash';
import Backbone from 'backbone';
import {
    enforest,
    getStringLiteral,
    JsonLdCollection,
    JsonLdModel,
    jsonLdSync,
    priorMethod,
} from "./jsonld.model";

function findById(graph, id) {
    return graph.find((subject) => subject["@id"] === id);
}

const exampleJsonLDGraph = [{
    "@id": "http://example.com/s1",
    "dc:title": "Title without references",
}, {
    "@id": "http://example.com/s2",
    "dc:title": "Title with one internal reference",
    "dc:description": {
        "@id": "http://example.com/descForS2",
    },
}, {
    "@id": "http://example.com/s3",
    "dc:title": "Title with one external (or missing) reference",
    "dc:description": {
        "@id": "http://example.com/somethingExternal",
    },
}, {
    "@id": "http://example.com/s4",
    "dc:title": "Title with one nested internal reference",
    "dc:description": {
        "@id": "http://example.com/descForS4",
    },
}, {
    "@id": "http://example.com/s5",
    "dc:title": "Title with sameAs s6",
    "owl:sameAs": {
        "@id": "http://example.com/s6",
    },
}, {
    "@id": "http://example.com/s6",
    "dc:title": "Title with sameAs s5",
    "owl:sameAs": {
        "@id": "http://example.com/s5",
    },
}, {
    "@id": "http://example.com/descForS4",
    "example:value": {
        "@id": "http://example.com/descForDescForS4"
    }
}, {
    "@id": "http://example.com/descForDescForS4",
    "example:value": "Random description",
}, {
    "@id": "http://example.com/descForS2",
    "example:value": "Random description",
}, {
    "@id": "http://example.com/s7",
    "dc:title": "Title with undetected cycle",
    "dc:description": {
        "@id": "http://example.com/descForS7",
    },
}, {
    "@id": "http://example.com/descForS7",
    "owl:sameAs": {
        "@id": "http://example.com/sameDescForS7",
    },
}, {
    "@id": "http://example.com/sameDescForS7",
    "owl:sameAs": {
        "@id": "http://example.com/descForS7",
    },
}, {
    "@id": "http://example.com/s8",
    "dc:title": "Title with nested array",
    "dc:description": [{
        "@id": "http://example.com/descForS2",
    }, {
        "@id": "http://example.com/descForS4",
    }, {
        "@id": "http://example.com/descForS7",
    }],
}, {
    "@id": "http://example.com/s9",
    "dc:title": "Title with nested @list",
    "dc:description": {'@list': [{
        "@id": "http://example.com/s3",
    }, {
        "@id": "http://example.com/descForS4",
    }, {
        "@id": "http://example.com/s5",
    }]},
}];

const singularJsonLdResource = exampleJsonLDGraph[0];


describe('enforest', () => {
    const enforestedSubjects = enforest(exampleJsonLDGraph);
    const subjectsByID = _.keyBy(enforestedSubjects, '@id');

    it('does not change anything if there are no references', () => {
        const ns = subjectsByID["http://example.com/s1"];
        assert.equal(ns["dc:title"], "Title without references");
    });

    it('correctly handles internal references', () => {
        const ns = subjectsByID["http://example.com/s2"];
        assert.equal("Random description", ns["dc:description"]["example:value"]);
    });

    it('does not alter external references', () => {
        const ns = subjectsByID["http://example.com/s3"];
        assert.equal(exampleJsonLDGraph[2]["dc:description"], ns["dc:description"]);
    });

    it('correctly handles a nested internal reference', () => {
        const ns = subjectsByID["http://example.com/s4"];
        assert.equal("Random description", ns["dc:description"]["example:value"]["example:value"]);
    });

    it('does not resolve a cyclical reference', () => {
        const ns = subjectsByID["http://example.com/s5"];
        assert.equal("http://example.com/s5", ns["owl:sameAs"]["owl:sameAs"]["@id"]);
    });

    it('detects cycles even if the root subject is not involved', () => {
        const ns = subjectsByID["http://example.com/s7"];
        assert.equal("http://example.com/descForS7", ns["dc:description"]["owl:sameAs"]["owl:sameAs"]["@id"]);
    });

    it('can handle arrays of internal references', () => {
        const ns = subjectsByID["http://example.com/s8"];
        assert.equal("Random description", ns["dc:description"][0]["example:value"]);
        assert.equal("Random description", ns["dc:description"][1]["example:value"]["example:value"]);
        assert.equal("http://example.com/descForS7", ns["dc:description"][2]["owl:sameAs"]["owl:sameAs"]["@id"]);
    });

    it('can handle @lists of internal references', () => {
        const ns = subjectsByID["http://example.com/s9"]["dc:description"]['@list'];
        assert.equal("http://example.com/s3", ns[0]["@id"]);
        assert.equal("Random description", ns[1]["example:value"]["example:value"]);
        assert.equal("http://example.com/s5", ns[2]["owl:sameAs"]["owl:sameAs"]["@id"]);
    });

    it('accepts a flag to only preserve top-level subjects', () => {
        const enforestedSubjects = enforest(exampleJsonLDGraph, true);
        assert(enforestedSubjects.length === 6);
    });
});

describe('getStringLiteral', () => {
    it ('returns null in case of an empty array', () => {
        assert(getStringLiteral([]) === null);
    });
    it ('returns the string in case of just a string', () => {
        assert(getStringLiteral("hoi") === "hoi");
    });
    it ('returns the string in case of just a langString', () => {
        assert(getStringLiteral({
            "@language": "nl",
            "@value": "hallo",
        }) === "hallo");
    });
    it ('returns the first string in case of an array of two strings', () => {
        assert(getStringLiteral(['hoi', 'hallo']) === 'hoi');
    });
    it ('returns the English string in case of an array of multiple langString, including one in English', () => {
        assert(getStringLiteral([{
            "@language": "nl",
            "@value": "hallo",
        }]), getStringLiteral([{
            "@language": "en",
            "@value": "hello",
        }]), getStringLiteral([{
            "@language": "fr",
            "@value": "bonjour",
        }]) === "hello");
    });
});

const methodBase = {};
const derived1 = _.create(methodBase);
const derived2 = _.create(derived1, {
    method() {},
});
const derived3 = _.create(derived2, {
    method() {},
});
const derived4 = _.create(derived3);
const derived5 = _.create(derived4);
const derived6 = _.create(derived5);
const derived7 = _.create(derived6);

describe('priorMethod', () => {
    it('finds the overridden method on a prototype', () => {
        const foundMethod = priorMethod(derived3, 'method', derived3.method);
        assert(foundMethod === derived2.method);
    });

    it('finds the overridden method on a prior prototype', () => {
        const foundMethod = priorMethod(derived4, 'method', derived3.method);
        assert(foundMethod === derived2.method);
    });

    it('finds the overridden method in a deep prototype chain', () => {
        const foundMethod = priorMethod(derived7, 'method', derived3.method);
        assert(foundMethod === derived2.method);
    });

    it('returns undefined if there is no prior method', () => {
        const foundMethod = priorMethod(derived2, 'method', derived2.method);
        assert(foundMethod === undefined);
    });
});

const BaseSyncer = Backbone.Model.extend({
    sync() { return 'tested'; },
});

const DerivedSyncer = BaseSyncer.extend({
    sync: jsonLdSync,
})

describe('jsonLdSync', () => {
    const options = {method: 'GET'};
    let spySync, instance;

    beforeEach(() => {
        spySync = sinon.spy(BaseSyncer.prototype, 'sync');
        instance = new DerivedSyncer;
    });

    afterEach(() => {
        instance = null;
        spySync.restore();
    });

    function assertSpyArgs(method, model, options, omitted) {
        const matchOptions = sinon.match(options);
        assert(spySync.calledWith(method, model, matchOptions));
        if (omitted) {
            assert(spySync.callCount === 1);
            const passedOptions = spySync.lastCall.args[2];
            assert(!(omitted in passedOptions));
        }
    }

    it('calls a prototypal sync method under the hood', () => {
        instance.sync();
        assert(spySync.called);
    });

    it('falls back to Backbone.sync in the absense of a prototype', () => {
        const bbSync = Backbone.sync;
        Backbone.sync = spySync;
        jsonLdSync();
        Backbone.sync = bbSync;
        assert(spySync.called);
    });

    it('forwards arguments to the underlying sync', () => {
        instance.sync('read', instance, options);
        assertSpyArgs('read', instance, options);
    });

    it('returns the result of the underlying sync', () => {
        const result = instance.sync();
        assert(result === 'tested');
    });

    _.each(['create', 'update', 'patch'], (method) => {
        it(`overrides the content type when the method is ${method}`, () => {
            const withOverride = _.extend({
                contentType: 'application/ld+json'
            }, options);
            instance.sync(method, instance, options);
            assertSpyArgs(method, instance, withOverride);
            assert(!('contentType' in options));
        });
    });

    _.each(['read', 'delete'], (method) => {
        it(`does not override when the method is ${method}`, () => {
            instance.sync(method, instance, options);
            assertSpyArgs(method, instance, options, 'contentType');
            assert(!('contentType' in options));
        });
    });
});

const testContext = {'@context': 'http://example.com/ld-context.json'};

describe('JsonLdModel', () => {
    let model;

    beforeEach(() => {
        model = new JsonLdModel;
    });

    describe('parse method', () => {
        it('forwards singular objects', () => {
            assert.deepStrictEqual(
                model.parse(singularJsonLdResource),
                singularJsonLdResource
            );
        });

        it('extracts singleton arrays', () => {
            assert.deepStrictEqual(
                model.parse([singularJsonLdResource]),
                singularJsonLdResource
            );
        });

        it('extracts singleton @graphs', () => {
            assert.deepStrictEqual(
                model.parse({'@graph': [singularJsonLdResource]}),
                singularJsonLdResource
            );
        });

        it('rejects empty arrays', () => {
            assert.throws(() => assert.deepStrictEqual(
                model.parse([]),
                undefined
            ));
        });

        it('rejects multi-item arrays', () => {
            assert.throws(() => assert.deepStrictEqual(
                model.parse(exampleJsonLDGraph),
                singularJsonLdResource
            ));
        });

        it('rejects empty @graphs', () => {
            assert.throws(() => assert.deepStrictEqual(
                model.parse({'@graph': []}),
                undefined
            ));
        });

        it('rejects multi-item @graphs', () => {
            assert.throws(() => assert.deepStrictEqual(
                model.parse({'@graph': exampleJsonLDGraph}),
                singularJsonLdResource
            ));
        });
    });

    describe('toJSON method', () => {
        beforeEach(() => {
            model.set(singularJsonLdResource);
        });

        it('usually spills the attributes verbatim', () => {
            assert.deepStrictEqual(
                model.toJSON(),
                singularJsonLdResource
            );
        });

        it('takes the collection context into account', () => {
            model.collection = {context: testContext['@context']};
            assert.deepStrictEqual(
                model.toJSON(),
                _.extend({}, singularJsonLdResource, testContext)
            );
        });
    });
});

describe('JsonLdCollection', () => {
    let collection;

    beforeEach(() => {
        collection = new JsonLdCollection;
    });

    afterEach(() => {
        collection.off().stopListening().reset();
    });

    describe('parse method', () => {
        it('forwards plain arrays', () => {
            assert.deepStrictEqual(
                collection.parse(exampleJsonLDGraph),
                exampleJsonLDGraph
            );
        });

        it('accepts singleton objects', () => {
            assert.deepStrictEqual(
                collection.parse(singularJsonLdResource),
                [singularJsonLdResource]
            );
        });

        it('extracts @graphs', () => {
            assert.deepStrictEqual(
                collection.parse({'@graph': exampleJsonLDGraph}),
                exampleJsonLDGraph
            );
        });

        it('stores the context if present', () => {
            const payload = _.extend({'@graph': exampleJsonLDGraph}, testContext);
            assert.deepStrictEqual(
                collection.parse(payload),
                exampleJsonLDGraph
            );
            assert(collection.context === testContext['@context']);
        });
    });

    describe('toJSON method', () => {
        beforeEach(() => {
            collection.set(exampleJsonLDGraph);
        });

        it('usually spills the contents of the models verbatim', () => {
            assert.deepStrictEqual(
                collection.toJSON(),
                exampleJsonLDGraph
            );
        });

        it('adds the context if present', () => {
            collection.context = testContext['@context'];
            assert.deepStrictEqual(
                collection.toJSON(),
                _.extend({'@graph': exampleJsonLDGraph}, testContext)
            );
        });
    });
});
