import { AggregateView } from "../core/view";
import fieldListTemplate from "./record.fields.view.mustache";
import { FieldView } from "./field.view";

export var RecordFieldsView = AggregateView.extend({
    template: fieldListTemplate,
    subview: FieldView,
    container: 'table',

    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
    },

    renderContainer: function() {
        this.$el.html(this.template(this));
        return this;
    },
});
