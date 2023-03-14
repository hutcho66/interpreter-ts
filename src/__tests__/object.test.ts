import {StringObj} from '../object';
describe('object', () => {
  it('should hash string keys', () => {
    const hello1 = new StringObj('hello');
    const hello2 = new StringObj('hello');
    const world1 = new StringObj('world');
    const world2 = new StringObj('world');

    expect(hello1.hash()).toEqual(hello2.hash());
    expect(world1.hash()).toEqual(world2.hash());
    expect(hello1.hash()).not.toEqual(world1.hash());
  });
});
