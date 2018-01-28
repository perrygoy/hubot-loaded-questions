// Copied from Kent C Dowd's answer here: https://github.com/facebook/jest/issues/281
// this is here because enrouten uses require.extensions (something that was deprecated in Node v0.10.0) and Jest
// doesn't support that API. Basically this just sticks a mock to the top of the relevant file.
module.exports = {
    process(src, filename, config, options) {
        return `
    // a jest transform inserted this code:
    require.extensions = {'.js': function() {}};
    // end jest transform
    ${src}
        `;
    },
};
