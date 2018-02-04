const Helper = require('hubot-test-helper');

const { SubmitAnswerMock } = require('./util');

jest.useFakeTimers();

const TIME_OUT = 5 * 60 * 1000;

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
            expect(lqBotRoom.messages[1]).toHaveLength(2);
            expect(lqBotRoom.messages[1][1]).toEqual(expect.stringContaining('Nah, you need to submit your answers'));
        });
    });
    describe('In a private message', () => {
        describe('If a round is not in progress', () => {
            let lqBotRoom;
            let submitAnswerMock;
            beforeEach(() => {
                const helper = new Helper('../../src/loaded-questions.js');
                lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
                submitAnswerMock = new SubmitAnswerMock(lqBotRoom);
                return submitAnswerMock.sendPrivate(
                    'billy',
                    'submit answer this is just between you and me betsbot',
                    true
                );
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
            let submitAnswerMock;

            beforeEach(async () => {
                const helper = new Helper('../../src/loaded-questions.js');
                lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
                submitAnswerMock = new SubmitAnswerMock(lqBotRoom);
                await lqBotRoom.user.say('billy', '!loadquestion');
                return await submitAnswerMock.sendPrivate(
                    'billy',
                    'submit answer this is billy\'s answer'
                );
            });
            afterEach(async () => {
                await lqBotRoom.user.say('billy', '!endquestion');
            });
            test('Reply to the user privately to confirm their answer submission', () => {
                const privateMsgKeys = Object.keys(lqBotRoom.privateMessages);
                expect(privateMsgKeys).toHaveLength(1);
                expect(privateMsgKeys[0]).toEqual('billy');
                expect(lqBotRoom.privateMessages['billy']).toHaveLength(2);
                expect(lqBotRoom.privateMessages['billy'][1][1]).toEqual(expect.stringContaining('Got it. If you change your mind, submit your answer again'));
            });
            test('Message the room with an updated answer count', async () => {
                expect(lqBotRoom.messages).toHaveLength(3);
                expect(lqBotRoom.messages[2][1]).toEqual(expect.stringContaining('Got an answer from someone! I now have 1 answer'));
                await submitAnswerMock.sendPrivate('bobby', 'submit answer this is bobby\'s answer');
                expect(lqBotRoom.messages).toHaveLength(4);
                expect(lqBotRoom.messages[3][1]).toEqual(expect.stringContaining('2'));
            });
            test('Update the user\'s statistics', () => {
                const {
                    numAnswers,
                    usersData,
                } = lqBotRoom.robot.brain.data.loadedQuestions;
                expect(numAnswers).toEqual(submitAnswerMock.getAnswerCount());
                expect(usersData['billy'].answers).toEqual(submitAnswerMock.getUserAnswerCount('billy'));
            });
            test('If this is the user\'s first answer, save it', () => {
                const answerData = lqBotRoom.robot.brain.data.loadedQuestionsGame.answers;
                expect(Object.keys(answerData)).toHaveLength(1);
                expect(answerData['billy'].answer).toEqual(expect.stringContaining('this is billy\'s answer'));
            });
            test('If this is the user\'s subsequent answer(s), update the previous', async () => {
                await submitAnswerMock.sendPrivate('billy','submit answer this is billy\'s updated answer');
                const answerData = lqBotRoom.robot.brain.data.loadedQuestionsGame.answers;
                expect(Object.keys(answerData)).toHaveLength(1);
                expect(answerData['billy'].answer).toEqual(expect.stringContaining('updated'));
            });
            describe('If it is the 5th answer...', () => {
                beforeEach(async () => {
                    const helper = new Helper('../../src/loaded-questions.js');
                    lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
                    submitAnswerMock = new SubmitAnswerMock(lqBotRoom);
                    await lqBotRoom.user.say('billy', '!loadquestion');
                    await submitAnswerMock.sendPrivate('billy','submit answer this is billy\'s answer');
                    await submitAnswerMock.sendPrivate('bobby', 'submit answer this is bobby\'s answer');
                    await submitAnswerMock.sendPrivate('ally', 'submit answer this is ally\'s answer');
                    await submitAnswerMock.sendPrivate('abby', 'submit answer this is abby\'s answer');
                    return await submitAnswerMock.sendPrivate('billobballabby', 'submit answer this is billobballabby\'s answer');
                });
                afterEach(async () => {
                    await lqBotRoom.user.say('billy', '!endquestion');
                });
                test('...post a quorum message to the room', () => {
                    expect(lqBotRoom.messages).toHaveLength(6);
                    expect(lqBotRoom.messages[5][1]).toEqual(expect.stringContaining('QUORUM REACHED!'));
                });
                test('...after 5 minutes, post an ending message to the room', async () => {
                    await jest.advanceTimersByTime(TIME_OUT);
    
                    expect(lqBotRoom.messages).toHaveLength(7);
                    expect(lqBotRoom.messages[6][1]).toEqual(expect.stringContaining('ROUND ENDED!!!'));
                });
                test('...after 5 minutes, ending message should include list of users who submitted answers', async () => {
                    await jest.advanceTimersByTime(TIME_OUT);
    
                    expect(lqBotRoom.messages).toHaveLength(7);
                    expect(lqBotRoom.messages[6][1]).toEqual(expect.stringContaining('billy'));
                    expect(lqBotRoom.messages[6][1]).toEqual(expect.stringContaining('bobby'));
                    expect(lqBotRoom.messages[6][1]).toEqual(expect.stringContaining('ally'));
                    expect(lqBotRoom.messages[6][1]).toEqual(expect.stringContaining('abby'));
                    expect(lqBotRoom.messages[6][1]).toEqual(expect.stringContaining('billobballabby'));
                });
            });
        });
    });
});
