import _ from 'lodash';
import { View } from '../core/view.js';
import alertTemplate from './alert.view.mustache';

/**
 * Reusable alert view. Meant to be displayed once and then discarded.
 *
 * The methods with a `complete` parameter accept three types of values:
 *
 *  1. any function, which will be executed after the animation completes;
 *  2. a string, which should be the name of a method of the alert view;
 *  3. undefined, in which case nothing is done after the animation completes.
 */
export var AlertView = View.extend({
    ease: 500,
    delay: 2000,
    className: 'alert alert-dismissible',
    template: alertTemplate,
    attributes: {
        role: 'alert',
    },
    events: {
        'click button': function() { this.animateOut('remove'); }
    },
    initialize: function(options) {
        _.assign(this, _.pick(options, ['level', 'message', 'ease', 'delay']));
        this.render();
    },
    render: function() {
        this.$el.addClass(this.getLevelClass()).html(this.template(this));
        return this;
    },
    remove: function() {
        AlertView.__super__.remove.call(this);
        this.trigger('removed', this);
    },
    // Show and hide automatically, then execute `complete`.
    animate: function(complete) {
        var followUp = _.bind(this.animateOut, this, complete);
        // The _.partial(...) below is a shorthand for _.bind(function() {
        //     _.delay(followUp, this.delay);
        // }, this), where _.delay in turn is a shorthand for setTimeout.
        return this.animateIn(_.partial(_.delay, followUp, this.delay));
    },
    // Show with ease and then execute `complete`.
    animateIn: function(complete) {
        this.$el.show(this.ease, this.wrapComplete(complete));
        return this;
    },
    // Hide with ease and then execute `complete`.
    animateOut: function(complete) {
        this.$el.hide(this.ease, this.wrapComplete(complete));
        return this;
    },
    getLevelClass: function() {
        return 'alert-' + this.level;
    },
    // Utility function that enables the "string as method name" magic.
    wrapComplete: function(complete) {
        return this[complete] && this[complete].bind(this) || complete;
    },
});
