/* eslint-disable @typescript-eslint/no-namespace */

import { MyNamespaceData as MyNamespaceDataAddress } from "./Address.avsc";

export type CreateUser = MyNamespaceMessages.CreateUser;

export namespace MyNamespaceMessages {
    export const CreateUserName = "my.namespace.messages.CreateUser";
    export interface CreateUser {
        userId: string;
        name: string;
        address: MyNamespaceDataAddress.Address;
    }
}
