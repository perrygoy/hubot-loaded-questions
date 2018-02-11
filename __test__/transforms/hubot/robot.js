// Copied from Kent C Dowd's answer here: https://github.com/facebook/jest/issues/281
// this is here because hubot uses require.extensions (deprecated in Node v0.10.10)
// Jest doesn't support that API. Basically this just sticks a mock to the top of the relevant file.
module.exports = {
    process(src) {
        return `
    // a jest transform inserted this code:
    require.extensions = {'.js': function() {}};
    // end jest transform
    ${src}
        `;
    },
};
