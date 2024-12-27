export default class MockLogger {
  constructor() {
    this.info = jest.fn();
    this.error = jest.fn();
    this.warn = jest.fn();
    this.debug = jest.fn();
  }
}
