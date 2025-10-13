import assert from 'assert';
import sinon from 'sinon';

import { View } from 'backbone';

import { OverlayView } from './overlay.view.js';

describe('OverlayView', function() {
    var overlayer, guest, host, spy;

    before(function() {
        guest = new View({tagName: 'p'});
        guest.$el.text('replacement');
        host = new View;
        host.$el.html('<p>original</p>');
    });

    after(function() {
        host.remove();
        guest.remove();
    });

    beforeEach(function() {
        overlayer = new OverlayView({
            root: host.el,
            target: 'p',
            guest: guest,
        });
    });

    afterEach(function() {
        spy = null;
        overlayer.remove();
    });

    function assertNotCovered() {
        assert(host.$el.text().match('original'));
        assert(!host.$el.text().match('replacement'));
        assert(!overlayer.isActive());
    }

    function assertCovered() {
        assert(!host.$el.text().match('original'));
        assert(host.$el.text().match('replacement'));
        assert(overlayer.isActive());
    }

    function assertIntegrity() {
        var targetElement = overlayer.covered || host.$('p');
        assert(guest.$el.text() === 'replacement');
        assert(targetElement.text() === 'original');
    }

    it('does not overlay the guest immediately', assertNotCovered);

    it('forwards events from the guest view', function() {
        spy = sinon.fake();
        overlayer.on('test', spy);
        assert(spy.notCalled);
        guest.trigger('test');
        assert(spy.calledOnce);
    });

    describe('cover', function() {
        beforeEach(function() {
            overlayer.cover();
        });

        it('substitutes the guest element for the target', assertCovered);

        it('has no adverse side effects', assertIntegrity);

        it('is idempotent', function() {
            overlayer.cover();
            assertCovered();
            assertIntegrity();
        });

        it('works after a previous uncover', function() {
            overlayer.uncover();
            overlayer.cover();
            assertCovered();
            assertIntegrity();
        });
    });

    describe('uncover', function() {
        beforeEach(function() {
            overlayer.uncover();
        });

        it('is a no-op initially', assertNotCovered);

        it('has no adverse side effects', assertIntegrity);

        it('is idempotent', function() {
            overlayer.uncover();
            assertNotCovered();
            assertIntegrity();
        });

        it('works after a previous cover', function() {
            overlayer.cover();
            overlayer.uncover();
            assertNotCovered();
            assertIntegrity();
        });
    });

    describe('toggle', function() {
        beforeEach(function() {
            overlayer.toggle();
        });

        it('covers the first time', assertCovered);

        it('uncovers the second time', function() {
            overlayer.toggle();
            assertNotCovered();
        });

        it('covers the third time', function() {
            overlayer.toggle().toggle();
            assertCovered();
        });
    });

    describe('remove', function() {
        it('calls remove on the guest view', function() {
            guest.remove = sinon.fake(guest.remove);
            overlayer.remove();
            assert(guest.remove.calledOnce);
        });

        it('restores the original situation', function() {
            overlayer.cover();
            overlayer.remove();
            assertNotCovered();
            assertIntegrity();
        });
    });
});
