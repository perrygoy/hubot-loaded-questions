module.exports = (src, TRANSFORM) => {
    const {
        CODE,
        INSERT_STRING,
    } = TRANSFORM;
    const moduleIndex = src.indexOf(INSERT_STRING);
    const insertIndex = moduleIndex + INSERT_STRING.length;

    return `
${src.substring(0, insertIndex)}
// a jest transform inserted this code:    
${CODE}
// end jest transform
${src.substring(insertIndex)}
`;
};
