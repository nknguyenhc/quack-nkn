import { StartBotJob } from "../utils/types";
import { UserManager } from "./temp";

const userStartJob: StartBotJob = () => {
    UserManager.loadUsers();
}

export default userStartJob;
