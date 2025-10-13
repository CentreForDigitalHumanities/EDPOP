import { AggregateView } from '../core/view.js';

import { ProjectMenuItemView } from './project.menu.item.view';
import projectMenuTemplate from './project.menu.view.mustache';

export var ProjectMenuView = AggregateView.extend({
    el: '#vre-project-menu',
    template: projectMenuTemplate,
    subview: ProjectMenuItemView,
    container: '.dropdown-menu',

    initialize: function (options) {
        this.$header = this.$('.dropdown-toggle');
        this.initItems().restoreSelection().render().initCollectionEvents()
            .listenTo(this.collection, {
                'update reset': this.restoreSelection,
                select: this.select,
            });
    },

    renderContainer: function () {
        var attributes = this.model ? this.model.toJSON() : {};
        this.$header.html(this.template(attributes));
        return this;
    },

    restoreSelection: function (collection) {
        if (!this.model || !this.collection.includes(this.model)) {
            var savedId = localStorage.getItem('project');
            if (savedId) {
                var savedProject = this.collection.get(savedId);
                this.select(savedProject);
            }
            else {
                this.select(this.collection.first());
            }
        }
        if (this.model) this.model.trigger('select', this.model);
        return this;
    },

    select: function (model) {
        // At this point, `model` could either be an instance of `Project` or
        // just an id. The next line ensures that it is a full-blown instance
        // (or `undefined`).
        model = this.collection.get(model);
        if (!model) return;
        if (model === this.model) return;
        if (this.model) this.model.trigger('deselect');
        this.model = model;
        this.renderContainer();
        this.trigger('select', model);
        localStorage.setItem('project', model.id);
    },
});
