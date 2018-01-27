const Helper = require('hubot-test-helper');

const helper = new Helper('../../../src/loaded-questions.js');

const lqBotRoom = helper.createRoom({ httpd: false });

const LqBotClass = require('../../../src/loaded-questions.js');

const lqBot = new LqBotClass(lqBotRoom.robot);

describe('Utility methods all perform their FUNCTION. Ha, get it?', () => {
    describe('getPluralizedNoun properly pluralizes nouns:', () => {
        test('Not pluralize when num param is 1', () => {
            expect(lqBot.getPluralizedNoun(1, 'Boat')).toBe('1 Boat');
        });
        test('Pluralize -y noun properly', () => {
            expect(lqBot.getPluralizedNoun(3, 'Icky', 'ies')).toBe('3 Ickies');
        });
        test('Pluralize non -y noun properly when num param is greater than 1', () => {
            expect(lqBot.getPluralizedNoun(4, 'Boat', 's')).toBe('4 Boats');
        });
    });

    describe('getPluralizedVerb properly pluralizes verbs:', () => {
        test('Not pluralize when num param is 1', () => {
            expect(lqBot.getPluralizedVerb(1, 'cut','cuts')).toBe('cut');
        });
        test('Pluralize when num param is greater than 1', () => {
            expect(lqBot.getPluralizedVerb(3, 'cut', 'cuts')).toBe('cuts');
        });
    });

    describe('getRandomInsult returns a string from the config', () => {
        const insults = require('../../../res/light_insults.json');
        test('getRandomInsult returns a string', () => {
            expect(typeof lqBot.getRandomInsult()).toBe('string');
        });
        test('getRandomInsult returns a member of insults config', () => {
            expect(insults).toContain(lqBot.getRandomInsult());
        });
    });
});

describe('Messaging methods to be accurate', () => {
    describe('messageRoom accurately displays message in chatroom', () => {
        const MESSAGE = 'I\'ve got a lovely bunch of coconuts';
        test('room messages length greater than 0', async () => {
            await lqBot.messageRoom(MESSAGE);
            expect(lqBotRoom.messages.length).toBeGreaterThan(0);
            expect(lqBotRoom.messages[0].length).toBeGreaterThan(1);
            expect(lqBotRoom.messages[0][1]).toBe(MESSAGE);
        });
    });
});



