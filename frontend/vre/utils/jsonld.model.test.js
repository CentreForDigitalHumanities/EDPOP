import assert from 'assert';
import sinon from 'sinon';
import {getStringLiteral, nestSubject} from "./jsonld.model";

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
}];

describe('nestSubject', () => {
    const subjectsByID = _.keyBy(exampleJsonLDGraph, "@id");

    it('does not change anything if there are no references', () => {
        const subject = subjectsByID["http://example.com/s1"];
        const ns = nestSubject(subjectsByID, subject);
        assert.equal(ns["dc:title"], "Title without references");
    });

    it('correctly handles internal references', () => {
        const subject = subjectsByID["http://example.com/s2"];
        const ns = nestSubject(subjectsByID, subject);
        assert.equal("Random description", ns["dc:description"]["example:value"]);
    });

    it('does not alter external references', () => {
        const subject = subjectsByID["http://example.com/s3"];
        const ns = nestSubject(subjectsByID, subject);
        assert.equal(subject["dc:description"], ns["dc:description"]);
    });

    it('correctly handles a nested internal reference', () => {
        const subject = subjectsByID["http://example.com/s4"];
        const ns = nestSubject(subjectsByID, subject);
        assert.equal("Random description", ns["dc:description"]["example:value"]["example:value"]);
    });

    it('does not resolve a recursive reference', () => {
        const subject = subjectsByID["http://example.com/s5"];
        const ns = nestSubject(subjectsByID, subject);
        assert.equal("http://example.com/s5", ns["owl:sameAs"]["owl:sameAs"]["@id"]);
    });

    it('detects cycles even if the root subject is not involved', () => {
        const subject = subjectsByID["http://example.com/s7"];
        const ns = nestSubject(subjectsByID, subject);
        assert.equal("http://example.com/descForS7", ns["dc:description"]["owl:sameAs"]["owl:sameAs"]["@id"]);
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
