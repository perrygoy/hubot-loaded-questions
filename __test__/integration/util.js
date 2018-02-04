const state = {
    answerCount: 0,
    userAnswerCounts: {},
};

class SubmitAnswerMock {
    constructor(room) {
        this.room = room;
        this.state = state;

        this._init();
    }

    _init() {
        this._setupHandlers();
    }

    _setupHandlers() {
        this.sendPrivate = this._sendPrivate.bind(this);
        this.getAnswerCount = this._getAnswerCount.bind(this);
        this.getUserAnswerCount = this._getUserAnswerCount.bind(this);
    }

    _getAnswerCount() {
        return this.state.answerCount;
    }

    _getUserAnswerCount(userName) {
        return this.state.userAnswerCounts[userName];
    }

    async _sendPrivate(userName, msg, noQuestion) {
        const msgInfo = [
            userName,
            msg,
            {
                profile: {
                    display_name: userName, // eslint-disable-line
                },
            },
        ];

        if (!noQuestion && msg.includes('submit answer')) {
            if (this.state.userAnswerCounts[userName] == null) {
                this.state.userAnswerCounts[userName] = 0;
            }
            this.state.userAnswerCounts[userName]++;
            this.state.answerCount++;
        }

        return await this.room.user.sayPrivate(...msgInfo);
    }
}

module.exports = {
    SubmitAnswerMock,
};
