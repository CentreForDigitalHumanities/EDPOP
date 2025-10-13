import assert from 'assert';
import sinon from 'sinon';
import { Model } from 'backbone';
import { AccountMenuView } from './account.menu.view';

describe('AccountMenuView', function() {
    beforeEach(function() {
        this.model = new Model({
            username: 'gebruiker',
            is_staff: false,
        });
        this.view = new AccountMenuView({model: this.model});
    });

    afterEach(function() {
        this.view.remove();
    });

    it('renders with the contents of its model', function() {
        const text = this.view.$el.text();
        assert(text.includes(this.model.get('username')));
    });

    it('shows link to admin page if user is staff user', function() {
        this.model.set({is_staff: true});
        const html = this.view.$el.html();
        assert(html.includes("/admin"));
    });
});
