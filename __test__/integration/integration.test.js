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
    afterAll(() => {
        return lqBotRoom.user.say('billy', '!endquestion');
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
    test('Set rooom topic when question is loaded', () => {
        const roomTopics = Object.values(lqBotRoom.robot.adapter.client.roomTopics);
        expect(roomTopics).toHaveLength(1);
    });
    test('Room topic should be the same as the active question', () => {
        const roomTopics = Object.values(lqBotRoom.robot.adapter.client.roomTopics);
        const { loadedQuestionsGame } = lqBotRoom.robot.brain.data;
        expect(roomTopics[0]).toEqual(loadedQuestionsGame.curQuestion);
    });
});

describe('When a user types \'submit answer\'', () => {
    describe('In a non-private message', () => {
        let lqBotRoom;
        beforeEach(() => {
            const helper = new Helper('../../src/loaded-questions.js');
            lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });

            return lqBotRoom.user.say(
                'billy',
                'submit answer for everyone to see!!!',
                {
                    profile: {
                        display_name: 'billy', // eslint-disable-line
                    },
                },
            );
        });
        test('Tell the user in the room that they must send the answer privately', () =>{
            expect(lqBotRoom.messages).toHaveLength(2);
            expect(lqBotRoom.messages[0]).toHaveLength(2);
            expect(lqBotRoom.messages[1][1]).toEqual(expect.stringContaining('Nah, you need to submit your answers'));
        });
    });
    describe('In a private message', () => {
        describe('If a round is not in progress', () => {
            let lqBotRoom;
            beforeEach(() => {
                const helper = new Helper('../../src/loaded-questions.js');
                lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
                return lqBotRoom.user.sayPrivate('billy', 'submit answer this is just between you and me betsbot');
            });
            test('Tell the user that there is no active question', () => {
                const privateMsgKeys = Object.keys(lqBotRoom.privateMessages);
                expect(privateMsgKeys).toHaveLength(1);
                expect(privateMsgKeys[0]).toEqual('billy');
                expect(lqBotRoom.privateMessages['billy']).toHaveLength(2);
                expect(lqBotRoom.privateMessages['billy'][1][1]).toEqual(expect.stringContaining('There isn\'t a question loaded right now'));
            });
        });
        describe('If a round is in progress', () => {
            let lqBotRoom;
            beforeEach(async () => {
                const helper = new Helper('../../src/loaded-questions.js');
                lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
                await lqBotRoom.user.say('billy', '!loadquestion');
                return await lqBotRoom.user.sayPrivate(
                    'billy',
                    'submit answer this is just between you and me betsbot',
                    {
                        profile: {
                            display_name: 'billy', // eslint-disable-line
                        },
                    },
                );
            });
            afterEach(() => {
                lqBotRoom.user.say('billy', '!endquestion');
            });
            test('Message the room with an updated answer count', () => {
                expect(lqBotRoom.messages).toHaveLength(3);
                expect(lqBotRoom.messages[2][1]).toEqual(expect.stringContaining(''))
            });
        });
        
    });
});

describe('When a user types \'!printquestion\'', () => {
    let lqBotRoom;
    beforeAll(() => {
        const helper = new Helper('../../src/loaded-questions.js');
        return lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
    });
    test('Print')
});

