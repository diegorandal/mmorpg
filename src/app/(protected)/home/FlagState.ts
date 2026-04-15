import { Schema, type, MapSchema } from "@colyseus/schema";
import { Portal } from "./Portal";
import { Player } from "./Player";

export class Flag extends Schema {

    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("string") keeper: string = "";

}

export class FlagRoomState extends Schema {

    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ map: Portal }) portals = new MapSchema<Portal>();
    @type(Flag) flag = new Flag();

}