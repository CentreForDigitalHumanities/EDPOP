import _ from 'lodash';
import Backbone from 'backbone';
import { AggregateView } from '../core/view.js';

import { vreChannel } from '../radio.js';
import optionDBTemplate from './select-collection-option.view.mustache';
import selectDBTemplate from './select-collection.view.mustache';

var CollectionOptionView = Backbone.View.extend({
    template: optionDBTemplate,
    events: {
        'click': 'select',
    },
    initialize: function() {
        this.render().listenTo(this.model, {
            focus: this.markSelected,
            blur: this.unmarkSelected,
        });
    },
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    markSelected: function() {
        this.$(".dropdown-item").addClass('active');
    },
    unmarkSelected: function() {
        this.$(".dropdown-item").removeClass('active');
    },
    select: function(event) {
        event.preventDefault();
        var href = $(event.target).attr('href');
        Backbone.history.navigate(href, true);
    },
});

export var SelectCollectionView = AggregateView.extend({
    template: selectDBTemplate,
    tagName: 'li',
    className: 'nav-item dropdown',
    subview: CollectionOptionView,
    container: 'div',
    events: {
        'submit .dropdown-menu form': 'createCollection',
    },
    initialize: function() {
        this.initItems().render().initCollectionEvents();
    },
    renderContainer: function() {
        this.$el.html(this.template(this));
        return this;
    },
    placeItems: function() {
        this._container.prepend(_.map(this.items, 'el'));
        return this;
    },
    createCollection: function(event) {
        event.preventDefault();
        var project = vreChannel.request('projects:current');
        if (!project) {
            alert("Please select a project before adding a collection.");
            return;
        }
        var input = this.$('.dropdown-menu form input');
        var name = input.val();
        this.collection.create({
            name: name,
            project: project.get('name'),
        });
        input.val('');
    },
});
