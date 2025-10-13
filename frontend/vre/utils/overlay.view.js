import _ from 'lodash';
import { View, $ } from 'backbone';

var targetAbsent = 'Overlay target selector does not match any element';
var guestAbsent = 'Overlay guest view disappeared from DOM';

export var OverlayView = View.extend({
    initialize: function(options) {
        _.extend(this, _.pick(options, ['target', 'guest']));
        this.root = $(options.root);
        this.listenTo(this.guest, 'all', this.trigger);
    },

    cover: function() {
        if (this.covered) return false;
        var covered = this.root.find(this.target).first();
        if (!covered.length) throw Error(targetAbsent);
        covered.after(this.guest.el).detach();
        this.covered = covered;
        return true;
    },

    uncover: function() {
        if (!this.covered) return false;
        if (!this.root.find(this.guest.el).length) throw Error(guestAbsent);
        this.guest.$el.before(this.covered).detach();
        delete this.covered;
        return true;
    },

    toggle: function() {
        this.cover() || this.uncover();
        return this;
    },

    isActive: function() {
        return !!this.covered;
    },

    remove: function() {
        this.uncover();
        this.guest.remove();
        return View.prototype.remove.call(this);
    },
});
