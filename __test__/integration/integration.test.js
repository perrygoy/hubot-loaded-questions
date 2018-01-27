const Helper = require('hubot-test-helper');

const helper = new Helper('../../src/loaded-questions.js');

const lqBotRoom = helper.createRoom({ httpd: false });

describe('When a user types \'!loadquestion\'', () => {
    beforeEach(async () => {
        await lqBotRoom.user.say('billy', '!loadquestion');
    });
    test('Start a new round if there is no active question', async () => {
        expect(lqBotRoom.messages).toHaveLength(2);
        expect(lqBotRoom.messages[0]).toHaveLength(2);
        expect(lqBotRoom.messages[1][1]).toEqual(expect.stringContaining('NEW ROUND STARTED'));
    });
});

