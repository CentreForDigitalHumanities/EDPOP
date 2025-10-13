import { vreChannel } from '../radio';
import { AccountMenuView } from '../user/account.menu.view';

export var accountMenu = new AccountMenuView({
    model: vreChannel.request('user')
});