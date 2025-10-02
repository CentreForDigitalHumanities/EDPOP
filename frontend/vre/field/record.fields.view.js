import {AggregateView} from "../core/view";
import { FilteredCollection } from "../utils/filtered.collection";
import fieldListTemplate from "./record.fields.view.mustache";
import {FieldView} from "./field.view";

function annotationMatchesField(model, targetField) {
    return function(annotation) {
        var field = annotation.get('edpopcol:field');
        if (field !== targetField) return false;
        var originalText = annotation.get('edpopcol:originalText');
        return !originalText || originalText === model.get('value')["edpoprec:originalText"];
    }
}

export var RecordFieldsView = AggregateView.extend({
    template: fieldListTemplate,
    container: 'tbody',

    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
    },

    makeItem: function(model) {
        var annotations = model.collection.record.annotations;
        var field = model.get('key');
        var annotationsForField = new FilteredCollection(
            annotations, annotationMatchesField(model, field)
        );
        var row = new FieldView({model: model, collection: annotationsForField});
        row.on('edit', this.edit, this);
        return row;
    },

    renderContainer: function() {
        this.$el.html(this.template(this));
        return this;
    },

    edit: function(model) {
        this.trigger('edit', model);
    },
});
