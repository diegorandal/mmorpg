import { Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
    @type("string") name: string = "";
    @type("number") x: number = 100;
    @type("number") y: number = 100;
    @type("number") hp: number = 100;
    @type("number") level: number = 1;
    @type("string") lastMessage: string = "";
}