import {AggregateView} from "../core/view";
import { FilteredCollection } from "../utils/filtered.collection";
import fieldListTemplate from "./record.fields.view.mustache";
import {FieldView} from "./field.view";


export var RecordFieldsView = AggregateView.extend({
    template: fieldListTemplate,
    container: 'tbody',

    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
    },

    makeItem: function(model) {
        var annotations = model.collection.record.annotations;
        var field = model.get('key');
        var annotationsForField = new FilteredCollection(annotations, (annotation) => {
            var selectField = annotation.get('edpopcol:selectField');
            var selectOriginalText = annotation.get('edpopcol:selectOriginalText');
            if (selectField) {
                var selectFieldId = selectField["@id"];
                if (selectFieldId === field) {
                    return !selectOriginalText || selectOriginalText === model.get('value')["edpoprec:originalText"];
                } else {
                    return false;
                }
            } else {
                return false;
            }
        });
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
