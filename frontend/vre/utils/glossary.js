import {JsonLdCollection} from "./jsonld.model";
import gemppg from "../gemppg.json";

export var Glossary = JsonLdCollection.extend({
    comparator: 'skos:prefLabel',
});

export var glossary = new Glossary(gemppg, {
    parse: true,
});
