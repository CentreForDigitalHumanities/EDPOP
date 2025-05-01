import { AggregateView } from '../core/view.js';
import fieldListTemplate from './digitizations.view.mustache';
import { DigitizationView } from "./digitization.view";

export var DigitizationsView = AggregateView.extend({
    template: fieldListTemplate,
    container: '#digitizations',

    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
    },

    makeItem: function(model) {
        return new DigitizationView({model: model});
    },

    renderContainer: function() {
        this.$el.html(this.template(this));
        return this;
    },
});
