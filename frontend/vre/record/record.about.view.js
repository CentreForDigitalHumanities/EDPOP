import Backbone from 'backbone';
import recordAboutTemplate from './record.about.view.mustache';

export var RecordAboutView = Backbone.View.extend({
    tagName: 'div',
    template: recordAboutTemplate,

    initialize: function() {
        this.render();
    },

    render: function() {
        this.$el.html(this.template({
            databaseId: this.model.get("edpoprec:identifier"),
            publicURL: this.model.get("edpoprec:publicURL"),
            fromCatalog: this.model.getCatalogName(),
        }));
        console.log(this.model.getCatalogName());
        return this;
    },
});
