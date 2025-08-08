import assert from 'assert';
import sinon from 'sinon';
import { each, after } from 'lodash';
import { Model, $ } from 'backbone';
import { AnnotationEditView } from './annotation.edit.view';
import {Annotation} from "./annotation.model";

describe('AnnotationEditView', function() {
    beforeEach(function() {
        this.model = new Annotation();
        this.view = new AnnotationEditView({model: this.model});
        this.view.render().$el.appendTo('body');
    });

    afterEach(function() {
        this.view.remove();
    });

    it('renders with a textarea and some buttons', function() {
        var textarea = this.view.$('textarea');
        assert(textarea.length === 1);
        assert(textarea[0].name === 'value');
        var buttons = this.view.$('button');
        assert(buttons.length === 3);
        assert(buttons[0].textContent === 'Save');
        assert(buttons[1].textContent === 'Cancel');
        assert(buttons[2].getAttribute('aria-label') === 'Delete');
    });

    it('has a popover which is initially hidden', function(done) {
        var ready = after(1, () => {
            assert(detectShow.called);
            assert(detectHide.notCalled);
            done();
        });
        var detectShow = sinon.fake(ready), detectHide = sinon.fake(ready);
        this.view.$el.on({
            'show.bs.popover': detectShow,
            'hide.bs.popover': detectHide,
        });
        this.view.$el.popover('toggle');
    });

    describe('on submit', function() {
        beforeEach(function() {
            this.detectSave = sinon.fake();
            var textarea = this.view.$('textarea');
            textarea.eq(0).val('green');
            this.view.on('save', this.detectSave).$('button').eq(0).click();
        });

        it('saves input data to the model', function() {
            assert(this.model.getBody() === 'green');
        });

        it('triggers a "save" event', function() {
            assert(this.detectSave.called);
        });
    });

    describe('on reset', function() {
        beforeEach(function() {
            this.detectCancel = sinon.fake();
            this.view.on('cancel', this.detectCancel).$('button').eq(1).click();
        });

        it('triggers a "cancel" event', function() {
            assert(this.detectCancel.called);
        });
    });

    describe('on delete', function() {
        beforeEach(function(done) {
            each(['PopOpen', 'PopClose', 'Trash'], function(name) {
                this['detect' + name] = sinon.fake();
            }.bind(this));
            var popoverSelector = '#confirm-delete-' + this.view.cid;
            var capturePopover = function() {
                this.popover = $(popoverSelector);
                done();
            }.bind(this);
            this.view.on('trash', this.detectTrash).$el.on({
                'show.bs.popover': this.detectPopOpen,
                'hide.bs.popover': this.detectPopClose,
                'shown.bs.popover': capturePopover,
            }).find('button').eq(2).click();
        });

        it('displays a popover for confirmation', function() {
            assert(this.detectPopOpen.called);
            assert(this.detectPopClose.notCalled);
            assert(this.popover.length === 1);
            assert(this.popover.find('button[type="reset"]').length === 1);
            assert(this.popover.find('button[type="submit"]').length === 1);
        });

        describe('on reset', function() {
            beforeEach(function() {
                this.popover.find('button[type="reset"]').click();
            });

            it('hides the popover', function() {
                assert(this.detectPopClose.called);
                assert(this.detectTrash.notCalled);
            });
        });

        describe('on confirm', function() {
            beforeEach(function() {
                this.popover.find('button[type="submit"]').click();
            });

            it('hides the popover and triggers a "trash" event', function() {
                assert(this.detectPopClose.called);
                assert(this.detectTrash.called);
            });
        });
    });
});
