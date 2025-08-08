import {JsonLdCollection} from "./jsonld.model";

export var Glossary = JsonLdCollection.extend({
    url: "/static/gemppg.json",
    comparator: 'skos:prefLabel',
});

export var glossary = new Glossary();
glossary.fetch();
