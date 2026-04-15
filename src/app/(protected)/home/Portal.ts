import { Schema, type } from "@colyseus/schema";

export enum PortalType { TELEPORT = "teleport", EXIT = "exit" };

export class Portal extends Schema {

    @type("string") id: string = "";
    @type("string") type: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("string") targetPortalId: string = "";
    @type("boolean") active: boolean = true;

}