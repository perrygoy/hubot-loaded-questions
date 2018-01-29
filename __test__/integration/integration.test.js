const Helper = require('hubot-test-helper');

describe('When a user types \'!loadquestion\'', () => {
    let lqBotRoom;
    beforeAll(() => {
        const helper = new Helper('../../src/loaded-questions.js');
        return lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
    });
    beforeEach(() => {
        return lqBotRoom.user.say('billy', '!loadquestion');
    });
    test('Start a new round if there is no active question', () => {
        expect(lqBotRoom.messages).toHaveLength(2);
        expect(lqBotRoom.messages[0]).toHaveLength(2);
        expect(lqBotRoom.messages[1][1]).toEqual(expect.stringContaining('NEW ROUND STARTED'));
    });
    test('Display a descriptive message if round is already active', () => {
        expect(lqBotRoom.messages).toHaveLength(4);
        expect(lqBotRoom.messages[3]).toHaveLength(2);
        expect(lqBotRoom.messages[3][1]).toEqual(expect.stringContaining('There is already a question loaded!'));
    });
});

