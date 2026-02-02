import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") name: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") hp: number = 0;
    @type("number") level: number = 0;
    @type("string") lastMessage: string = "";
}

export class MyRoomState extends Schema {

    @type({ map: Player }) players = new MapSchema<Player>();

}