import { Schema, type, MapSchema } from "@colyseus/schema";
import { Portal } from "./Portal";
import { Player } from "./Player";

export class MyRoomState extends Schema {

    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ map: Portal }) portals = new MapSchema<Portal>();

}