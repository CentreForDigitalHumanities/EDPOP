import { vreChannel } from "../radio";
import User from "../user/user.model";

const user = User.my();

vreChannel.reply("user", user);
