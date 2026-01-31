import { Schema, type, MapSchema } from '@colyseus/schema';


export class Player extends Schema {
    @type("string") name: string = "";
    @type("number") x: number = 100;
    @type("number") y: number = 100;
    @type("number") hp: number = 100;
    @type("number") level: number = 1;
    @type("string") lastMessage: string = "";
}

export class MyRoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}