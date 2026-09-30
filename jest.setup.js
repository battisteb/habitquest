// Screen tests wait for async updates with RNTL's waitFor (1 s by default).
// The full suite runs ~40 files in parallel: on a busy machine a screen can
// take longer than 1 s to settle, which made arena/coop tests flaky.
const { configure } = require('@testing-library/react-native');

configure({ asyncUtilTimeout: 5000 });
