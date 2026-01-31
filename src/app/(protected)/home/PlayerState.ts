import { Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
    @type('string') name = '';
    @type('number') x = 0;
    @type('number') y = 0;
    @type('string') lastMessage = '';
}