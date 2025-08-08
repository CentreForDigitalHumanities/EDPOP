import {AggregateView} from "../core/view";
import fieldListTemplate from "./record.fields.view.mustache";
import {FieldView} from "./field.view";


export var RecordFieldsView = AggregateView.extend({
    template: fieldListTemplate,
    container: 'tbody',

    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
    },

    makeItem: function(model) {
        var row = new FieldView({model: model});
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
