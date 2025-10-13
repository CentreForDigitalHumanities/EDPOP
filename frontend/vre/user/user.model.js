import { APIModel } from "../utils/api.model";

/**
 * User model. The API currently only supports requesting the logged-in
 * user, but this may be extended to other users.
 */
const User = APIModel.extend({
    url: '/api/accounts/user/',
}, {
    /**
     * Class method to retrieve user of the currently logged in user.
     */
    my: function() {
        const activeAccount = new User();
        activeAccount.fetch();
        return activeAccount;
    }
});

export default User;
