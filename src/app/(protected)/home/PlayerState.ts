import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") name: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") hp: number = 0;
    @type("number") character: number = 1;
    @type("string") direction: string = "down";
    @type("number") weapon: number = 0;
    @type("number") lookx: number = 0;
    @type("number") looky: number = 1;
    @type("number") pot: number = 0;
    @type("number") defence: number = 0;
}

export class MyRoomState extends Schema {

    @type({ map: Player }) players = new MapSchema<Player>();

}